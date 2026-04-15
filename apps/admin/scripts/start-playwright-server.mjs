import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const pnpmCommand = 'pnpm';
const buildIdPath = resolve(cwd, '.next', 'BUILD_ID');
const nodeOptions = process.env.NODE_OPTIONS
  ? `${process.env.NODE_OPTIONS} --max-old-space-size=4096`
  : '--max-old-space-size=4096';

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions,
        NEXT_DISABLE_WEBPACK_CACHE: '1',
      },
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      rejectPromise(new Error(`Command failed: ${command} ${args.join(' ')} (exit ${code ?? 'unknown'})`));
    });

    child.on('error', rejectPromise);
  });
}

async function main() {
  if (!existsSync(buildIdPath)) {
    await run(pnpmCommand, ['build']);
  }

  const server = spawn(pnpmCommand, ['start'], {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
      NEXT_DISABLE_WEBPACK_CACHE: '1',
    },
  });

  const forwardSignal = (signal) => {
    if (!server.killed) {
      server.kill(signal);
    }
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  server.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  server.on('error', (error) => {
    throw error;
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});