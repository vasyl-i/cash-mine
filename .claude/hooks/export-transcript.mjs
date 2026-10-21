#!/usr/bin/env node
// Stop / SessionEnd hook: renders the current Claude Code session transcript (JSONL)
// to ai-logs/<date>_<session>.md. Re-runs overwrite the same file, so it is always complete.
//
// Redaction: values of every KEY=VALUE in local .env* files (except .env.example) are
// replaced with [REDACTED:KEY]. This script runs in the harness, not in Claude's context,
// so secrets never reach the model. Harness-injected <system-reminder> blocks are omitted.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_TOOL_INPUT = 4000;
const MAX_TOOL_OUTPUT = 2500;

const hook = JSON.parse(readFileSync(0, 'utf8') || '{}');
const projectDir = process.env.CLAUDE_PROJECT_DIR || hook.cwd || process.cwd();
const transcriptPath = hook.transcript_path;
if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0);

const secrets = loadSecrets(projectDir);
const entries = readFileSync(transcriptPath, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter((e) => e && (e.type === 'user' || e.type === 'assistant') && !e.isSidechain);

if (entries.length === 0) process.exit(0);

const out = [];
const startedAt = entries[0].timestamp ?? new Date().toISOString();
out.push(`# Claude Code session ${hook.session_id ?? ''}`.trim());
out.push(`\n- Started: ${startedAt}\n- Last update: ${new Date().toISOString()}\n`);

let lastSpeaker = null;
for (const e of entries) {
  const content = e.message?.content;
  const blocks = typeof content === 'string' ? [{ type: 'text', text: content }] : (content ?? []);
  for (const b of blocks) {
    const isToolResult = b.type === 'tool_result';
    const speaker = e.type === 'user' && !isToolResult ? 'user' : 'assistant';
    const rendered = renderBlock(b, e);
    if (!rendered) continue;
    if (speaker !== lastSpeaker) {
      out.push(
        speaker === 'user'
          ? `\n---\n\n## 👤 User  \n<sub>${e.timestamp ?? ''}</sub>\n`
          : `\n## 🤖 Claude\n`,
      );
      lastSpeaker = speaker;
    }
    out.push(rendered);
  }
}

const dir = join(projectDir, 'ai-logs');
mkdirSync(dir, { recursive: true });
const file = join(
  dir,
  `${startedAt.slice(0, 10)}_${(hook.session_id ?? 'session').slice(0, 8)}.md`,
);
writeFileSync(file, redact(out.join('\n')) + '\n');

function renderBlock(b, e) {
  switch (b.type) {
    case 'text': {
      const text = stripReminders(b.text ?? '').trim();
      if (!text) return null;
      if (e.isMeta) return `<details><summary>meta</summary>\n\n${text}\n\n</details>\n`;
      return `${text}\n`;
    }
    case 'thinking':
      return b.thinking?.trim()
        ? `<details><summary>💭 thinking</summary>\n\n${b.thinking.trim()}\n\n</details>\n`
        : null;
    case 'tool_use':
      return `**🔧 ${b.name}**\n\n${fence(truncate(formatInput(b.input), MAX_TOOL_INPUT))}\n`;
    case 'tool_result': {
      const text = stripReminders(toolResultText(b.content)).trim();
      const label = b.is_error ? '❌ result (error)' : '↳ result';
      return `<details><summary>${label}</summary>\n\n${fence(truncate(text || '(empty)', MAX_TOOL_OUTPUT))}\n\n</details>\n`;
    }
    default:
      return null;
  }
}

function formatInput(input = {}) {
  if (typeof input.command === 'string') {
    const desc = input.description ? `# ${input.description}\n` : '';
    return desc + input.command;
  }
  return JSON.stringify(input, null, 2);
}

function toolResultText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content))
    return content.map((c) => (c.type === 'text' ? c.text : `[${c.type}]`)).join('\n');
  return '';
}

function stripReminders(s) {
  return s.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');
}

function truncate(s, max) {
  return s.length > max ? `${s.slice(0, max)}\n… [truncated ${s.length - max} chars]` : s;
}

function fence(s) {
  const ticks = s.includes('```') ? '````' : '```';
  return `${ticks}\n${s}\n${ticks}`;
}

function loadSecrets(root) {
  const found = [];
  let files = [];
  try {
    files = readdirSync(root).filter((f) => /^\.env(\..+)?$/.test(f) && f !== '.env.example');
  } catch {
    return found;
  }
  for (const f of files) {
    for (const line of readFileSync(join(root, f), 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^['"]|['"]$/g, '').trim();
      if (value.length >= 6) found.push([m[1], value]);
    }
  }
  // Longest first so overlapping values (e.g. URL containing another value) redact cleanly.
  return found.sort((a, b) => b[1].length - a[1].length);
}

function redact(s) {
  let result = s;
  for (const [key, value] of secrets) result = result.split(value).join(`[REDACTED:${key}]`);
  // Belt and braces: generic bearer tokens and the author's e-mail.
  result = result.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/g, '$1[REDACTED]');
  result = result.replace(/[\w.+-]+@gmail\.com/g, '[REDACTED:EMAIL]');
  return result;
}
