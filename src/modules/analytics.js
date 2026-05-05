'use strict';

const memory = require('../memory');
const prompts = require('../prompts');
const { runStep } = require('../runner');

async function run() {
  const profile = memory.load('business-profile');
  const strategy = memory.load('strategy');
  const plan = memory.load('plan');
  if (!profile || !strategy) {
    throw new Error('Run `cmo-agent init`, `discover`, and `strategy` first.');
  }
  return runStep({
    artifact: 'analytics',
    system: prompts.ANALYTICS,
    user:
      'Design the measurement system for this business based on CONTEXT. Output a KPI tree ' +
      'rooted at the north-star metric, an attribution recommendation with reasoning, a ' +
      'concrete event tracking plan, dashboards tied to decisions, and a prioritized ' +
      'experiment backlog.',
    context: { businessProfile: profile, strategy, plan },
  });
}

module.exports = { run };
