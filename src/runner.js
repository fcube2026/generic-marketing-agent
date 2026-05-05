'use strict';

/**
 * Shared helpers used by every module.
 */

const llm = require('./llm');
const memory = require('./memory');

/**
 * Try to parse a JSON object from a model response. Tolerates accidental code
 * fences or surrounding prose.
 */
function parseJsonLoose(text) {
  if (!text) return null;
  let s = String(text).trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  // Otherwise try to slice from first { to last }.
  if (s[0] !== '{') {
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      s = s.slice(start, end + 1);
    }
  }
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

/**
 * Run a single module step and persist the result.
 *
 * @param {object} opts
 * @param {string} opts.artifact - Memory artifact name to save under.
 * @param {string} opts.system   - System prompt.
 * @param {string} opts.user     - User prompt.
 * @param {object} [opts.context] - Structured context to pass.
 * @returns {Promise<object>} { saved: object, raw: string, file: string }
 */
async function runStep({ artifact, system, user, context }) {
  const raw = await llm.complete({ system, user, context, json: true });

  let parsed = parseJsonLoose(raw);
  if (!parsed) {
    parsed = {
      _warning:
        'Model did not return valid JSON. Raw output preserved under "raw" for human review.',
      raw,
    };
  }

  const file = memory.save(artifact, parsed);
  memory.logRun({
    artifact,
    dryRun: llm.isDryRun(),
    bytes: raw.length,
  });
  return { saved: parsed, raw, file };
}

module.exports = { parseJsonLoose, runStep };
