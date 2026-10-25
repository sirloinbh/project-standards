// A public repository cannot call a reusable workflow that lives in a private repository, so a
// public app's ci.yml is the central reusable workflow itself with the caller's inputs filled in (#209).
import fs from 'node:fs';
import path from 'node:path';
import { addHeader } from './render.mjs';

export const REUSABLE_APP_CI = '.github/workflows/reusable-app-ci.yml';
export const APP_CI = '.github/workflows/ci.yml';

const unquote = (v) => (/^'.*'$|^".*"$/.test(v) ? v.slice(1, -1) : v === 'true' ? true : v === 'false' ? false : v);

/** Reads the `with:` values of a rendered caller workflow (one `key: value` per line). */
export function callerInputs(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^\s+with:\s*$/.test(l));
  if (start < 0) throw new Error(`${APP_CI}: the caller has no with: block`);
  const inputs = {};
  for (const line of lines.slice(start + 1)) {
    const m = /^\s+([\w-]+):\s*(.*?)\s*$/.exec(line);
    if (!m) break;
    inputs[m[1]] = unquote(m[2]);
  }
  return inputs;
}

/** Splits a reusable workflow into its declared inputs (with defaults) and the rest of the text. */
function splitWorkflowCall(text) {
  const lines = text.split('\n');
  const on = lines.findIndex((l) => l === 'on:');
  if (on < 0) throw new Error(`${REUSABLE_APP_CI}: no top-level on: block`);
  let end = on + 1;
  while (end < lines.length && (lines[end] === '' || /^\s/.test(lines[end]))) end++;
  const declared = {};
  let name = null;
  for (const line of lines.slice(on + 1, end)) {
    const input = /^ {6}([\w-]+):\s*$/.exec(line);
    if (input) declared[(name = input[1])] = undefined;
    const def = /^ {8}default:\s*(.*?)\s*$/.exec(line);
    if (def && name) declared[name] = unquote(def[1]);
  }
  return { declared, before: lines.slice(0, on), after: lines.slice(end) };
}

/** Returns the reusable workflow as a standalone push/pull_request workflow for the given inputs. */
export function inlineReusable(reusable, given) {
  const { declared, before, after } = splitWorkflowCall(reusable.replace(/\r\n/g, '\n'));
  const unknown = Object.keys(given).filter((k) => !(k in declared));
  if (unknown.length) throw new Error(`${REUSABLE_APP_CI}: the caller passes unknown input(s): ${unknown.join(', ')}`);
  const inputs = { ...declared, ...given };
  const value = (name) => {
    if (!(name in inputs)) throw new Error(`${REUSABLE_APP_CI}: inputs.${name} is not declared`);
    if (inputs[name] === undefined) throw new Error(`${REUSABLE_APP_CI}: required input ${name} has no value`);
    return inputs[name];
  };
  // The reusable workflow's own leading comments describe how it is called, so they are dropped.
  const rest = before.filter((l) => !l.startsWith('#')).map((l) => (/^name:/.test(l) ? 'name: ci' : l));
  const body = [...rest, 'on: [push, pull_request]', '', ...after]
    .join('\n')
    // A whole ${{ inputs.x }} expression becomes the plain value...
    .replace(/\$\{\{\s*inputs\.([\w-]+)\s*\}\}/g, (_, name) => String(value(name)))
    // ...and what is left are inputs inside conditions such as `if: inputs.e2e && !inputs.e2e-visual`.
    .replace(/\binputs\.([\w-]+)/g, (_, name) => {
      const v = value(name);
      return typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
    });
  const intro = '# public 리포는 private 중앙 리포의 재사용 워크플로를 부를 수 없어서, 중앙 reusable-app-ci.yml을 이 리포의 값으로 펼쳐 넣었다(#209).';
  return `${intro}\n${body}`;
}

/** Content of a public app's ci.yml, with the managed header pointing at the reusable workflow. */
export function inlineAppCi(root, callerText) {
  const reusable = fs.readFileSync(path.join(root, REUSABLE_APP_CI), 'utf8');
  return addHeader(inlineReusable(reusable, callerInputs(callerText)), APP_CI, REUSABLE_APP_CI);
}
