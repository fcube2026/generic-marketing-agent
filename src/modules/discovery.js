'use strict';

const memory = require('../memory');
const prompts = require('../prompts');
const { runStep } = require('../runner');

/**
 * Discovery: turn the business profile into ICPs, positioning, competitor
 * landscape, and the open questions the team must answer before strategy.
 */
async function run() {
  const profile = memory.load('business-profile');
  if (!profile) {
    throw new Error(
      'No business profile found. Run `cmo-agent init` first to create .cmo-agent/business-profile.json.'
    );
  }
  return runStep({
    artifact: 'business-profile',
    system: prompts.DISCOVERY,
    user:
      'Analyze the business profile in CONTEXT. Produce the structured discovery JSON ' +
      'as specified in your system prompt. Be sharp, opinionated, and call out missing inputs.',
    context: profile,
  }).then(async (res) => {
    // Discovery enriches the existing business profile rather than replacing it.
    const merged = { ...profile, discovery: res.saved };
    memory.save('business-profile', merged);
    return { ...res, saved: merged };
  });
}

module.exports = { run };
