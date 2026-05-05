'use strict';

const memory = require('../memory');
const prompts = require('../prompts');
const { runStep } = require('../runner');

async function run() {
  const profile = memory.load('business-profile');
  const strategy = memory.load('strategy');
  if (!profile || !strategy) {
    throw new Error('Run `cmo-agent init`, `discover`, and `strategy` first.');
  }
  return runStep({
    artifact: 'plan',
    system: prompts.PLANNING,
    user:
      'Translate the strategy in CONTEXT into a cascading execution plan as specified. ' +
      'Be ruthless about prioritization, list quick wins explicitly, and use RICE scoring ' +
      'for the backlog. Flag any items that need human approval.',
    context: { businessProfile: profile, strategy },
  });
}

module.exports = { run };
