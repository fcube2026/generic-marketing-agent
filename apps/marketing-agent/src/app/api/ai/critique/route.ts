import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, TEXT_MODEL } from '@/lib/ai/openai-client';
import { requireMarketingAuth } from '@/lib/ai/auth';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/ai/rate-limit';
import { pollinationsChat, PollinationsError } from '@/lib/ai/pollinations';
import { getErrorStatus } from '@/lib/ai/error-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_OUTPUT_CHARS = 12000;

interface RubricItem {
  id: string;
  description: string;
  weight: number;
}

interface CritiqueRequestBody {
  output?: unknown;
  rubric?: unknown;
  skillName?: unknown;
}

interface ScoreRow {
  id: string;
  score: number;
  comment: string;
}

interface CritiqueResult {
  overallScore: number;
  scores: ScoreRow[];
  weakestSection: string;
  suggestion: string;
}

function badRequest(message: string, code: string) {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

function isRubric(v: unknown): v is RubricItem[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 12 &&
    v.every(
      (it) =>
        it &&
        typeof it === 'object' &&
        typeof (it as RubricItem).id === 'string' &&
        typeof (it as RubricItem).description === 'string' &&
        typeof (it as RubricItem).weight === 'number',
    )
  );
}

function buildSystemPrompt(skillName: string): string {
  return `You are a strict, evidence-based marketing-output evaluator. You score the supplied output against the provided rubric. Be honest, terse, and actionable. The skill being evaluated is: ${skillName}.

You MUST respond with a single JSON object (no prose, no markdown fence). Schema:
{
  "scores": [{"id": "<rubric.id>", "score": <0-100>, "comment": "<1-2 sentences>"}, ...],
  "weakestSection": "<which part of the output is weakest>",
  "suggestion": "<one concrete improvement to regenerate the weakest section>"
}
Score every rubric criterion. Use the full 0-100 range; reserve 90+ for genuinely excellent work.`;
}

function buildUserPrompt(rubric: RubricItem[], output: string): string {
  const rubricLines = rubric
    .map((r) => `- ${r.id} (weight ${r.weight}): ${r.description}`)
    .join('\n');
  return `Rubric:\n${rubricLines}\n\nOutput to grade:\n"""\n${output}\n"""`;
}

function weightedAverage(rubric: RubricItem[], scores: ScoreRow[]): number {
  let totalW = 0;
  let acc = 0;
  for (const s of scores) {
    const r = rubric.find((x) => x.id === s.id);
    if (!r) continue;
    totalW += r.weight;
    acc += r.weight * Math.max(0, Math.min(100, s.score));
  }
  return totalW > 0 ? Math.round(acc / totalW) : 0;
}

function parseCritique(raw: string, rubric: RubricItem[]): CritiqueResult {
  // Strip markdown fences if the model wrapped its JSON.
  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  let parsed: { scores?: ScoreRow[]; weakestSection?: string; suggestion?: string };
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      overallScore: 0,
      scores: rubric.map((r) => ({
        id: r.id,
        score: 0,
        comment: 'Critic did not return valid JSON.',
      })),
      weakestSection: 'unknown',
      suggestion: 'Re-run the critic — the model returned malformed JSON.',
    };
  }
  const scores: ScoreRow[] = Array.isArray(parsed.scores)
    ? parsed.scores
        .filter(
          (s) =>
            s &&
            typeof s.id === 'string' &&
            typeof s.score === 'number' &&
            typeof s.comment === 'string',
        )
        .map((s) => ({
          id: s.id,
          score: Math.max(0, Math.min(100, Math.round(s.score))),
          comment: s.comment.slice(0, 400),
        }))
    : [];
  return {
    overallScore: weightedAverage(rubric, scores),
    scores,
    weakestSection:
      typeof parsed.weakestSection === 'string' ? parsed.weakestSection.slice(0, 200) : '',
    suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion.slice(0, 600) : '',
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireMarketingAuth(req);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`ai-critique:${getClientKey(req)}`, { max: 30, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: CritiqueRequestBody;
  try {
    body = (await req.json()) as CritiqueRequestBody;
  } catch {
    return badRequest('Body must be valid JSON', 'invalid_json');
  }
  if (typeof body.output !== 'string' || body.output.length === 0) {
    return badRequest('`output` must be a non-empty string', 'invalid_output');
  }
  if (body.output.length > MAX_OUTPUT_CHARS) {
    return badRequest(`\`output\` exceeds ${MAX_OUTPUT_CHARS} characters`, 'output_too_long');
  }
  if (!isRubric(body.rubric)) {
    return badRequest('`rubric` must be an array of {id, description, weight}', 'invalid_rubric');
  }
  const skillName =
    typeof body.skillName === 'string' && body.skillName.trim()
      ? body.skillName.trim().slice(0, 80)
      : 'unknown skill';

  const system = buildSystemPrompt(skillName);
  const user = buildUserPrompt(body.rubric, body.output);

  let raw: string | null = null;

  // Resolve OpenAI client; if missing, fall straight through to Pollinations.
  let client: ReturnType<typeof getOpenAIClient> | null = null;
  try {
    client = getOpenAIClient();
  } catch {
    client = null;
  }

  if (client) {
    try {
      const completion = await client.chat.completions.create({
        model: TEXT_MODEL,
        max_tokens: 600,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      const status = getErrorStatus(err);
      if (status === 401 || status === 403) {
        // fall through to Pollinations
        client = null;
      } else {
        // eslint-disable-next-line no-console
        console.error('[ai/critique] OpenAI error', {
          status,
          message: (err as Error)?.message,
        });
        return NextResponse.json(
          { error: 'AI provider error', code: 'provider_error' },
          { status: 502 },
        );
      }
    }
  }

  if (!client && !raw) {
    try {
      raw = await pollinationsChat({
        system,
        messages: [{ role: 'user', content: user }],
      });
    } catch (fb) {
      const status = fb instanceof PollinationsError ? fb.status : 502;
      // eslint-disable-next-line no-console
      console.error('[ai/critique] Pollinations fallback failed', {
        status,
        message: (fb as Error)?.message,
      });
      return NextResponse.json(
        { error: 'Critic provider unavailable', code: 'provider_error' },
        { status: 502 },
      );
    }
  }

  if (!raw) {
    return NextResponse.json(
      { error: 'Empty critic response', code: 'empty_reply' },
      { status: 502 },
    );
  }

  const critique = parseCritique(raw, body.rubric);
  return NextResponse.json(critique);
}
