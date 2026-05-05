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
    artifact: 'lifecycle',
    system: prompts.LIFECYCLE,
    user:
      'Build the lifecycle marketing system for this business based on CONTEXT. Define ' +
      'concrete segments, an onboarding flow with day-by-day messages, activation nudges, ' +
      'a winback flow, a referral loop, and an automation blueprint mapped to tool categories.',
    context: { businessProfile: profile, strategy },
  });
}

module.exports = { run };
