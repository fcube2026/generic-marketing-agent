const { spawn } = require('child_process');
const path = require('path');

const cliPath = path.resolve(__dirname, '../../../node_modules/expo/bin/cli');
const baseArgs = ['--max-old-space-size=4096', cliPath, 'start'];
const userArgs = process.argv.slice(2);

function buildNodeOptions() {
  const existing = process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.trim() : '';
  const ipv4First = '--dns-result-order=ipv4first';

  if (process.platform !== 'win32' || existing.includes(ipv4First)) {
    return existing;
  }

  return existing ? `${existing} ${ipv4First}` : ipv4First;
}

function runExpo(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...baseArgs, ...args], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        NODE_OPTIONS: buildNodeOptions(),
      },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let output = '';

    const forward = (stream, target) => {
      stream.on('data', (chunk) => {
        const text = chunk.toString();
        output += text;
        target.write(chunk);
      });
    };

    forward(child.stdout, process.stdout);
    forward(child.stderr, process.stderr);

    child.on('close', (code, signal) => {
      resolve({ code: code ?? 1, signal, output });
    });
  });
}

function shouldRetryOffline(output, args) {
  if (args.includes('--offline')) {
    return false;
  }

  return (
    output.includes('https://api.expo.dev/v2/sdks/') &&
    output.includes('/native-modules') &&
    output.toLowerCase().includes('socket hang up')
  );
}

async function main() {
  const firstRun = await runExpo(userArgs);

  if (!shouldRetryOffline(firstRun.output, userArgs)) {
    process.exit(firstRun.code);
  }

  process.stderr.write(
    '\nExpo metadata fetch failed. Retrying with --offline so Metro can still start.\n',
  );

  const retryRun = await runExpo([...userArgs, '--offline']);
  process.exit(retryRun.code);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});