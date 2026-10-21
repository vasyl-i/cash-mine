#!/usr/bin/env node
// PostToolUse hook (Edit|MultiEdit|Write): format, lint and type-check the edited file.
// Exit 2 + stderr feeds remaining problems back to Claude so it fixes them immediately.
// Tests are not run here (too slow per edit) — they stay in `npm run check`.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const LINTABLE = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const TYPED = new Set(['.ts', '.tsx']);
const FORMATTABLE = new Set([...LINTABLE, '.json', '.md']);

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let filePath;
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!filePath) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = path.relative(projectDir, path.resolve(filePath));
const base = path.basename(rel);
const ext = path.extname(rel);

const outsideProject = rel.startsWith('..') || path.isAbsolute(rel);
const skipped = rel.startsWith('node_modules') || rel.startsWith('ai-logs') || rel.startsWith('dist');
if (outsideProject || skipped || base.startsWith('.env') || !FORMATTABLE.has(ext)) process.exit(0);

const run = (cmd, args) =>
  spawnSync(cmd, args, { cwd: projectDir, encoding: 'utf8', shell: process.platform === 'win32' });

const problems = [];

run('npx', ['prettier', '--write', '--ignore-unknown', '--log-level', 'warn', rel]);

if (LINTABLE.has(ext)) {
  const lint = run('npx', ['eslint', '--fix', '--max-warnings', '0', rel]);
  if (lint.status !== 0) problems.push(`ESLint (${rel}):\n${lint.stdout}${lint.stderr}`.trim());
}

if (TYPED.has(ext)) {
  const tsc = run('npx', ['tsc', '--noEmit', '--pretty', 'false']);
  if (tsc.status !== 0) problems.push(`TypeScript (project):\n${tsc.stdout}${tsc.stderr}`.trim());
}

if (problems.length > 0) {
  process.stderr.write(`${problems.join('\n\n')}\n`);
  process.exit(2);
}