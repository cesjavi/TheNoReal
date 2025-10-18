#!/usr/bin/env node

const { spawn } = require('node:child_process');

function log(message) {
  process.stdout.write(`${message}\n`);
}

const env = { ...process.env };
const unpooled = env.DATABASE_URL_UNPOOLED && env.DATABASE_URL_UNPOOLED.trim();
const primary = env.DATABASE_URL && env.DATABASE_URL.trim();
const connectionString = unpooled || primary;

if (!connectionString) {
  log('[db:push] DATABASE_URL/DATABASE_URL_UNPOOLED not provided, skipping Prisma sync.');
  process.exit(0);
}

env.DATABASE_URL = connectionString;

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['prisma', 'db', 'push'];

const child = spawn(command, args, {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[db:push] Failed to run Prisma CLI:', error);
  process.exit(1);
});
