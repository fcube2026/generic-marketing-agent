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
    artifact: 'outreach',
    system: prompts.OUTREACH,
    user:
      'Produce ready-to-send partnership, influencer, and PR outreach assets aligned to ' +
      'CONTEXT. Templates must be specific to this business, not generic. Include disqualifiers ' +
      'and a community engagement plan.',
    context: { businessProfile: profile, strategy },
  });
}

module.exports = { run };
