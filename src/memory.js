'use strict';

/**
 * File-based memory store.
 *
 * Persists everything the agent learns and produces under a single data
 * directory (default `.cmo-agent/`). One JSON file per artifact, plus an
 * append-only `runs.jsonl` log so every workflow execution is auditable.
 *
 * Artifacts:
 *   business-profile.json   - Inputs about the business / ICPs / competitors.
 *   strategy.json           - Brand, GTM, channel, content, lifecycle strategy.
 *   plan.json               - 30/60/90, quarterly, monthly, weekly plans.
 *   content.json            - Calendars, briefs, copy, SEO clusters.
 *   lifecycle.json          - Onboarding / nurture / winback flows.
 *   analytics.json          - KPI tree, experiments, weekly review template.
 *   outreach.json           - Partnership / influencer / PR templates.
 *   runs.jsonl              - Append-only log of every agent run.
 */

const fs = require('fs');
const path = require('path');

const ARTIFACTS = [
  'business-profile',
  'strategy',
  'plan',
  'content',
  'lifecycle',
  'analytics',
  'outreach',
];

function dataDir() {
  return path.resolve(process.cwd(), process.env.CMO_AGENT_DATA_DIR || '.cmo-agent');
}

function ensureDir() {
  const dir = dataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function artifactPath(name) {
  if (!ARTIFACTS.includes(name)) {
    throw new Error(`Unknown artifact "${name}". Known: ${ARTIFACTS.join(', ')}`);
  }
  return path.join(ensureDir(), `${name}.json`);
}

function load(name) {
  const file = artifactPath(name);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read ${name}.json: ${err.message}`);
  }
}

function save(name, data) {
  const file = artifactPath(name);
  const payload = {
    ...data,
    _meta: {
      ...(data && data._meta ? data._meta : {}),
      artifact: name,
      updatedAt: new Date().toISOString(),
    },
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

function loadAll() {
  const out = {};
  for (const name of ARTIFACTS) {
    out[name] = load(name);
  }
  return out;
}

function logRun(entry) {
  const file = path.join(ensureDir(), 'runs.jsonl');
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  fs.appendFileSync(file, line + '\n', 'utf8');
}

function clear() {
  const dir = dataDir();
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = {
  ARTIFACTS,
  dataDir,
  artifactPath,
  load,
  save,
  loadAll,
  logRun,
  clear,
};
