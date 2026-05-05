'use strict';

/**
 * Smoke test: runs the full CMO loop end-to-end in DRY-RUN mode (no API key)
 * against the example business profile, then asserts every artifact was saved.
 *
 * Run with: `npm test`
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// Use a throwaway data dir + ensure no API key leaks in.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmo-agent-smoke-'));
process.env.CMO_AGENT_DATA_DIR = tmp;
process.env.LLM_API_KEY = '';

const memory = require('../src/memory');
const agent = require('../src/agent');
const { parseJsonLoose } = require('../src/runner');

(async () => {
  const examplePath = path.join(__dirname, '..', 'examples', 'business-profile.example.json');
  const profile = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
  memory.save('business-profile', profile);

  // parseJsonLoose unit checks
  assert.deepStrictEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 }, 'fenced JSON');
  assert.deepStrictEqual(parseJsonLoose('prefix {"b":2} suffix'), { b: 2 }, 'embedded JSON');
  assert.strictEqual(parseJsonLoose('not json at all'), null, 'invalid JSON returns null');

  const results = await agent.runAll();
  for (const step of ['discover', 'strategy', 'plan', 'content', 'lifecycle', 'analytics', 'outreach']) {
    assert.ok(results[step], `missing result for ${step}`);
    assert.ok(fs.existsSync(results[step].file), `missing file for ${step}`);
  }

  const artifacts = ['business-profile', 'strategy', 'plan', 'content', 'lifecycle', 'analytics', 'outreach'];
  for (const a of artifacts) {
    const data = memory.load(a);
    assert.ok(data, `artifact "${a}" should be persisted`);
    assert.ok(data._meta && data._meta.updatedAt, `artifact "${a}" should have _meta.updatedAt`);
  }

  // Discovery should have enriched the business profile in-place.
  const profileAfter = memory.load('business-profile');
  assert.ok(profileAfter.discovery, 'business profile should contain a "discovery" key after discover()');

  // Runs log should exist and be append-only JSONL with one line per module.
  const runsLog = path.join(tmp, 'runs.jsonl');
  assert.ok(fs.existsSync(runsLog), 'runs.jsonl should be written');
  const lines = fs.readFileSync(runsLog, 'utf8').trim().split('\n');
  assert.strictEqual(lines.length, 7, 'runs.jsonl should have 7 entries (one per module)');
  for (const line of lines) {
    const entry = JSON.parse(line);
    assert.strictEqual(entry.dryRun, true, 'should be flagged as dry-run');
  }

  // Cleanup
  fs.rmSync(tmp, { recursive: true, force: true });

  process.stdout.write('OK — full CMO loop ran end-to-end in dry-run mode.\n');
})().catch((err) => {
  process.stderr.write(`FAIL: ${err.stack || err.message}\n`);
  process.exit(1);
});
