'use strict';

/**
 * Core agent orchestrator.
 *
 * Composes the modules into the standard CMO loop:
 *
 *   discover → strategy → plan → (content || lifecycle || analytics || outreach)
 *
 * Each module persists its artifact to the data directory; subsequent modules
 * pick up prior artifacts from there. This is what makes the agent's memory
 * "compounding" — every run enriches a single living plan rather than dumping
 * one-shot outputs.
 */

const memory = require('./memory');
const llm = require('./llm');

const discovery = require('./modules/discovery');
const strategy = require('./modules/strategy');
const planning = require('./modules/planning');
const content = require('./modules/content');
const lifecycle = require('./modules/lifecycle');
const analytics = require('./modules/analytics');
const outreach = require('./modules/outreach');

const MODULES = {
  discover: discovery,
  strategy,
  plan: planning,
  content,
  lifecycle,
  analytics,
  outreach,
};

async function runModule(name) {
  const mod = MODULES[name];
  if (!mod) {
    throw new Error(`Unknown module "${name}". Known: ${Object.keys(MODULES).join(', ')}`);
  }
  return mod.run();
}

/**
 * Run the full CMO loop end-to-end. Stops on the first error so partial state
 * is never silently overwritten.
 */
async function runAll() {
  const order = ['discover', 'strategy', 'plan', 'content', 'lifecycle', 'analytics', 'outreach'];
  const results = {};
  for (const name of order) {
    results[name] = await runModule(name);
  }
  return results;
}

module.exports = {
  MODULES,
  runModule,
  runAll,
  memory,
  llm,
};
