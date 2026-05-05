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
    artifact: 'content',
    system: prompts.CONTENT,
    user:
      'Produce ready-to-ship content assets aligned to the strategy and plan in CONTEXT. ' +
      'Calendar entries must be concrete (real working titles, hooks, CTAs). Ad and email ' +
      'copy must be variant-tested with explicit hypotheses.',
    context: { businessProfile: profile, strategy, plan },
  });
}

module.exports = { run };
