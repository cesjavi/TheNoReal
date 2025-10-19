import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const pythonCmd = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ?? '4000';
const shouldReload = process.argv.includes('--reload');

const args = ['-m', 'uvicorn', 'app.main:app', '--host', host, '--port', port];
if (shouldReload) {
  args.push('--reload');
}

const child = spawn(pythonCmd, args, {
  cwd: backendRoot,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
