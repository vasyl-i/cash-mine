#!/usr/bin/env node
// PreToolUse guard: blocks Claude from touching any .env file except .env.example.
// Exit code 2 = block the tool call; stderr is shown to Claude.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const { tool_name: tool = '', tool_input: args = {} } = input;

// `.env`, `.env.local`, `.env.production`, `.env*` ... but not `.env.example`,
// and not `process.env` / `expo-env.d.ts` (preceded by a word char or dash).
const ENV_REF = /(^|[\s/'"`=:;(|&<>*])\.env(?!\.example\b)(?![\w-])/;

const candidates = [];
if (tool === 'Bash') candidates.push(args.command);
else candidates.push(args.file_path, args.path, args.pattern, args.glob, args.notebook_path);

const hit = candidates.filter((v) => typeof v === 'string').find((v) => ENV_REF.test(v));

if (hit) {
  process.stderr.write(
    `Blocked by .claude/hooks/guard-env.mjs: access to .env files is forbidden ` +
      `(only .env.example is allowed). The user manages .env files manually.\n`,
  );
  process.exit(2);
}
process.exit(0);
