import { spawn } from 'node:child_process';
// Accept the standard preview host/port options and translate them to Next.js.
const input = process.argv.slice(2);
const args = ['dev'];
for (let i = 0; i < input.length; i++) {
  if (input[i] === '--strictPort') continue;
  args.push(input[i] === '--host' ? '--hostname' : input[i]);
}
if (!args.includes('--hostname')) args.push('--hostname', '0.0.0.0');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...args], { stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 0));
