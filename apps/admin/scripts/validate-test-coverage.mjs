import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const manifestPath = resolve(rootDir, 'e2e/test-manifest.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (!Array.isArray(manifest.routes)) {
  console.error('Invalid test manifest: expected a top-level "routes" array.');
  process.exit(1);
}

let hasErrors = false;
const missing = [];

for (const entry of manifest.routes) {
  const smokeFile = resolve(rootDir, entry.smokeSpec);
  const regressionFile = resolve(rootDir, entry.regressionSpec);
  const pomFile = resolve(rootDir, entry.pomClass);

  if (!existsSync(smokeFile)) {
    missing.push(`MISSING smoke spec for "${entry.route}": ${entry.smokeSpec}`);
    hasErrors = true;
  }

  if (!existsSync(regressionFile)) {
    missing.push(`MISSING regression spec for "${entry.route}": ${entry.regressionSpec}`);
    hasErrors = true;
  }

  if (!existsSync(pomFile)) {
    missing.push(`MISSING POM class for "${entry.route}": ${entry.pomClass}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\nTest coverage validation FAILED:\n');
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  console.error('\nAdd the missing files, or update apps/admin/e2e/test-manifest.json.\n');
  process.exit(1);
}

console.log(`Test coverage validated: all ${manifest.routes.length} admin routes have smoke, regression, and POM coverage.`);