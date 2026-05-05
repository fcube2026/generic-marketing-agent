'use strict';

const memory = require('../memory');
const prompts = require('../prompts');
const { runStep } = require('../runner');

async function run() {
  const profile = memory.load('business-profile');
  if (!profile) {
    throw new Error('Run `cmo-agent init` first, then `cmo-agent discover`.');
  }
  return runStep({
    artifact: 'strategy',
    system: prompts.STRATEGY,
    user:
      'Using the business profile and discovery findings in CONTEXT, produce the complete ' +
      'marketing strategy JSON exactly as specified in your system prompt. Be opinionated ' +
      'about channel priorities and explicit about kill criteria.',
    context: { businessProfile: profile },
  });
}

module.exports = { run };
