// Tests the managed backend file templates/app/backend/src/standard/auth.ts (#667): sign-in is off only in explicit
// local mode. The file imports @sirloinbh/auth-client, which apps install from npm; here it points at packages/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const source = fs.readFileSync('templates/app/backend/src/standard/auth.ts', 'utf8');
const client = pathToFileURL(path.resolve('packages/auth-client/index.mjs')).href;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-auth-'));
const file = path.join(dir, 'auth.ts');
fs.writeFileSync(file, source.replace("'@sirloinbh/auth-client'", `'${client}'`));
const { sharedAuth } = await import(pathToFileURL(file).href);
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const quiet = () => {};

test('with AUTH_INTERNAL_URL it returns the session check in every mode', () => {
  for (const NODE_ENV of [undefined, 'production', 'staging', 'development'])
    assert.equal(typeof sharedAuth({ AUTH_INTERNAL_URL: 'http://shared-auth-api:3110', NODE_ENV }, quiet), 'function', String(NODE_ENV));
});

test('without AUTH_INTERNAL_URL it refuses to start unless the mode is explicitly local', () => {
  for (const NODE_ENV of [undefined, '', 'production', 'staging', 'prod', 'Development'])
    assert.throws(() => sharedAuth({ NODE_ENV }, quiet), /AUTH_INTERNAL_URL is required/, String(NODE_ENV));
  assert.throws(() => sharedAuth({ NODE_ENV: 'production', AUTH_DISABLED: '0' }, quiet), /AUTH_INTERNAL_URL is required/);
});

test('explicit local mode returns undefined and logs one warning', () => {
  for (const env of [{ NODE_ENV: 'development' }, { NODE_ENV: 'test' }, { AUTH_DISABLED: '1' }]) {
    const lines = [];
    assert.equal(sharedAuth(env, (m) => lines.push(m)), undefined, JSON.stringify(env));
    assert.equal(lines.length, 1);
    assert.match(lines[0], /WITHOUT sign-in/);
  }
});
