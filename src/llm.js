'use strict';

/**
 * LLM client.
 *
 * Talks to any OpenAI-compatible Chat Completions endpoint. If no API key is
 * configured, falls back to DRY-RUN mode and returns a deterministic, templated
 * response so the agent is fully runnable without external services.
 */

const DEFAULTS = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  temperature: 0.4,
  maxTokens: 2000,
  timeoutMs: 60000,
};

function getConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: (process.env.LLM_BASE_URL || DEFAULTS.baseUrl).replace(/\/+$/, ''),
    model: process.env.LLM_MODEL || DEFAULTS.model,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || DEFAULTS.temperature),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || DEFAULTS.maxTokens, 10),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || DEFAULTS.timeoutMs, 10),
  };
}

function isDryRun() {
  return !getConfig().apiKey;
}

/**
 * Run a single chat completion.
 *
 * @param {object} opts
 * @param {string} opts.system - System prompt.
 * @param {string} opts.user - User prompt.
 * @param {object} [opts.context] - Optional structured context (stringified into the user message).
 * @param {boolean} [opts.json] - If true, request JSON-formatted output.
 * @returns {Promise<string>} Raw text response.
 */
async function complete({ system, user, context, json = false }) {
  const cfg = getConfig();
  const fullUser = context
    ? `${user}\n\n--- CONTEXT (JSON) ---\n${JSON.stringify(context, null, 2)}`
    : user;

  if (!cfg.apiKey) {
    return dryRunResponse({ system, user: fullUser, json });
  }

  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. Node.js >= 18 is required.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const body = {
      model: cfg.model,
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: fullUser },
      ],
    };
    if (json) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(
        `LLM request failed: ${res.status} ${res.statusText} ${errText}`.trim()
      );
    }
    const data = await res.json();
    const content =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
    return (content || '').trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Deterministic offline response so the agent is runnable without an API key.
 * Useful for local development, CI, demos, and tests.
 */
function dryRunResponse({ system, user, json }) {
  const head =
    '[DRY-RUN] No LLM_API_KEY configured. Returning a templated response so you can ' +
    'see the agent end-to-end. Set LLM_API_KEY in .env to get real AI output.';
  if (json) {
    return JSON.stringify(
      {
        dryRun: true,
        note: head,
        moduleFocus: summarize(system, 200),
        request: summarize(user, 400),
        suggestion:
          'Configure LLM_API_KEY (and optionally LLM_BASE_URL / LLM_MODEL) to generate real strategy and assets.',
      },
      null,
      2
    );
  }
  return [
    head,
    '',
    '## Templated Output',
    '',
    `- Module focus: ${summarize(system, 140)}`,
    `- Your request: ${summarize(user, 240)}`,
    '',
    'Replace this stub by setting LLM_API_KEY in your environment.',
  ].join('\n');
}

function summarize(text, max = 200) {
  if (!text) return '';
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

module.exports = { complete, isDryRun, getConfig };
