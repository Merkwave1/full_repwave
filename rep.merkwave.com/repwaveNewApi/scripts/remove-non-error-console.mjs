#!/usr/bin/env node
/**
 * remove-non-error-console.mjs
 * Removes all occurrences of console.log/info/warn/debug/trace (multi-line supported) from source files.
 * Keeps console.error.
 */
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src');
const TARGET_EXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const CONSOLE_REGEX = /^(\s*)console\.(log|info|warn|debug|trace)\s*\(/;

let filesScanned = 0;
let filesModified = 0;
let statementsRemoved = 0;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      await walk(full);
    } else {
      const ext = path.extname(e.name);
      if (TARGET_EXT.has(ext)) {
        await processFile(full);
      }
    }
  }
}

function countParens(str) {
  let count = 0;
  let inSingle = false, inDouble = false, inTemplate = false, escape = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
    else if (ch === '`' && !inSingle && !inDouble) inTemplate = !inTemplate;
    if (inSingle || inDouble || inTemplate) continue;
    if (ch === '(') count++;
    else if (ch === ')') count--;
  }
  return count;
}

async function processFile(filePath) {
  filesScanned++;
  const orig = await readFile(filePath, 'utf8');
  const lines = orig.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(CONSOLE_REGEX);
    if (!m) {
      out.push(line);
      i++;
      continue;
    }
    // Start removing multi-line statement
    let parenBalance = countParens(line.substring(line.indexOf('(')));
    let j = i + 1;
    while (parenBalance > 0 && j < lines.length) {
      parenBalance += countParens(lines[j]);
      j++;
    }
    statementsRemoved++;
    i = j; // skip removed block
  }
  if (statementsRemoved > 0) {
    const updated = out.join('\n');
    if (updated !== orig) {
      await writeFile(filePath, updated, 'utf8');
      filesModified++;
    }
  }
}

async function main() {
  const start = Date.now();
  await walk(ROOT);
  const ms = Date.now() - start;
  console.error(`[remove-non-error-console] Done in ${ms}ms. Files scanned: ${filesScanned}, modified: ${filesModified}, statements removed: ${statementsRemoved}`);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
