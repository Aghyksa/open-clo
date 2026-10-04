import { spawn } from 'node:child_process';
import './build.mjs';
const environment = { ...process.env, NODE_ENV: 'development', PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:5173' };
const children = [
  spawn(process.execPath, ['--watch', 'server/main.mjs'], { stdio: 'inherit', env: environment }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--strictPort'], { stdio: 'inherit', env: environment }),
];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach((child) => child.kill('SIGTERM')); process.exitCode = code; }
for (const child of children) child.on('exit', (code) => stop(code || 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
