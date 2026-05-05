#!/usr/bin/env node
'use strict';

/**
 * cmo-agent CLI
 *
 * Commands:
 *   init [--from <file>]    Create / overwrite the business profile.
 *   discover                Run discovery (ICPs, positioning, competitors).
 *   strategy                Generate the full marketing strategy.
 *   plan                    Generate cascading 30/60/90 + weekly plans.
 *   content                 Generate calendars, briefs, ad/email/landing copy.
 *   lifecycle               Generate onboarding, retention, referral flows.
 *   analytics               Generate KPI tree, tracking plan, experiments.
 *   outreach                Generate partnership / influencer / PR templates.
 *   run-all                 Run the full loop end-to-end.
 *   show <artifact>         Print a stored artifact as JSON.
 *   export [--out <dir>]    Export all artifacts to a directory.
 *   status                  Show config, data dir, and which artifacts exist.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Command } = require('commander');

const agent = require('../src/agent');
const memory = require('../src/memory');
const llm = require('../src/llm');

const program = new Command();
program
  .name('cmo-agent')
  .description('Generic AI Marketing Agent — owns strategy and execution end-to-end.')
  .version(require('../package.json').version);

function info(msg) {
  process.stdout.write(`${msg}\n`);
}
function warn(msg) {
  process.stderr.write(`! ${msg}\n`);
}

function showDryRunBanner() {
  if (llm.isDryRun()) {
    warn('Running in DRY-RUN mode (no LLM_API_KEY set). Outputs will be templated stubs.');
    warn('Set LLM_API_KEY in .env to generate real strategy and assets.');
  }
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

// ---- init ----
program
  .command('init')
  .description('Create or overwrite the business profile in the data directory.')
  .option('-f, --from <file>', 'Load business profile from a JSON file')
  .option('--example', 'Seed from examples/business-profile.example.json')
  .action(async (opts) => {
    let data;
    if (opts.from) {
      data = JSON.parse(fs.readFileSync(path.resolve(opts.from), 'utf8'));
    } else if (opts.example) {
      data = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'examples', 'business-profile.example.json'), 'utf8')
      );
    } else {
      info('No --from or --example provided. Launching minimal interactive intake.');
      data = await interactiveIntake();
    }
    const file = memory.save('business-profile', data);
    info(`Saved business profile → ${file}`);
    info('Next: `npm run discover` (or `npx cmo-agent discover`).');
  });

async function interactiveIntake() {
  const business = {
    name: await prompt('Business name: '),
    one_liner: await prompt('One-liner (what you do, for whom): '),
    stage: await prompt('Stage (idea | pre-seed | seed | seriesA | growth | mature): '),
    geography_primary: await prompt('Primary geography: '),
  };
  const offering = {
    type: await prompt('Offering type (SaaS | marketplace | DTC | services | …): '),
    category: await prompt('Category: '),
    pricing_model: await prompt('Pricing model: '),
  };
  const value = {
    problem: await prompt('Problem you solve: '),
    promise: await prompt('Core promise / value prop: '),
    differentiators: (await prompt('Differentiators (comma-separated): '))
      .split(',').map((s) => s.trim()).filter(Boolean),
  };
  const audience = {
    icps: [
      {
        name: await prompt('Primary ICP name: '),
        roles: (await prompt('Primary ICP roles (comma-separated): '))
          .split(',').map((s) => s.trim()).filter(Boolean),
        pain: await prompt('Primary ICP pain: '),
      },
    ],
  };
  const current_marketing = {
    channels_active: (await prompt('Channels currently active (comma-separated): '))
      .split(',').map((s) => s.trim()).filter(Boolean),
    monthly_budget_usd: Number(await prompt('Monthly marketing budget in USD: ')) || 0,
  };
  return { business, offering, value, audience, current_marketing };
}

// ---- module commands ----
function moduleCommand(name, description) {
  program
    .command(name)
    .description(description)
    .action(async () => {
      showDryRunBanner();
      try {
        const res = await agent.runModule(name === 'plan' ? 'plan' : name);
        info(`✓ Saved → ${res.file}`);
      } catch (err) {
        warn(err.message);
        process.exitCode = 1;
      }
    });
}

moduleCommand('discover', 'Run discovery: ICPs, positioning, competitor landscape.');
moduleCommand('strategy', 'Generate the complete marketing strategy.');
moduleCommand('plan', 'Generate 30/60/90, monthly, weekly plans + RICE-scored backlog.');
moduleCommand('content', 'Generate content calendar, briefs, ad/email/landing copy.');
moduleCommand('lifecycle', 'Generate onboarding, retention, winback, referral flows.');
moduleCommand('analytics', 'Generate KPI tree, tracking plan, experiment backlog.');
moduleCommand('outreach', 'Generate partnership, influencer, and PR templates.');

// ---- run-all ----
program
  .command('run-all')
  .description('Run the full CMO loop: discover → strategy → plan → content → lifecycle → analytics → outreach.')
  .action(async () => {
    showDryRunBanner();
    try {
      const results = await agent.runAll();
      for (const [step, res] of Object.entries(results)) {
        info(`✓ ${step.padEnd(10)} → ${res.file}`);
      }
    } catch (err) {
      warn(err.message);
      process.exitCode = 1;
    }
  });

// ---- show ----
program
  .command('show <artifact>')
  .description(`Print a stored artifact as JSON. One of: ${memory.ARTIFACTS.join(', ')}`)
  .action((artifact) => {
    const data = memory.load(artifact);
    if (!data) {
      warn(`No artifact "${artifact}" found in ${memory.dataDir()}.`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  });

// ---- export ----
program
  .command('export')
  .description('Export all artifacts to a directory (defaults to ./cmo-export).')
  .option('-o, --out <dir>', 'Output directory', './cmo-export')
  .action((opts) => {
    const outDir = path.resolve(opts.out);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const all = memory.loadAll();
    let count = 0;
    for (const [name, data] of Object.entries(all)) {
      if (!data) continue;
      const file = path.join(outDir, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
      info(`✓ ${file}`);
      count += 1;
    }
    info(`Exported ${count} artifact(s) to ${outDir}.`);
  });

// ---- status ----
program
  .command('status')
  .description('Show current configuration and which artifacts exist.')
  .action(() => {
    const cfg = llm.getConfig();
    info('cmo-agent status');
    info(`  data dir       : ${memory.dataDir()}`);
    info(`  llm base URL   : ${cfg.baseUrl}`);
    info(`  llm model      : ${cfg.model}`);
    info(`  llm api key    : ${cfg.apiKey ? 'set' : 'NOT set (dry-run mode)'}`);
    info('  artifacts      :');
    for (const a of memory.ARTIFACTS) {
      const present = memory.load(a) ? 'yes' : 'no ';
      info(`    [${present}] ${a}`);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  warn(err.stack || err.message);
  process.exit(1);
});
