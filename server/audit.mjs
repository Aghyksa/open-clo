import { spawnSync } from 'node:child_process';
// npm 11 exports an install-only option into child scripts; audit never runs install scripts.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_config_allow_scripts'));
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--audit-level=high', '--ignore-scripts'], { env, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
