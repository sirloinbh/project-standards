// Repository-specific values for the shared agent worker. The worker itself holds no
// project names, tables or merge policy: the target repository's origin selects the
// GitHub repository (it must be listed in registry/projects.json) and its committed
// `.agents.json` supplies the check script, database probe and auto-merge policy.
import fs from 'node:fs';
import path from 'node:path';

export const OWNER = 'sirloinbh';
export const REPO_CONFIG = '.agents.json';

const identifier = /^[a-z_][a-z0-9_]*$/;
const scriptName = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;

export function parseOrigin(remote) {
  const match =
    /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/.exec(remote) ||
    /^git@github\.com:([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?$/.exec(remote);
  if (!match) throw new Error('Origin is not a GitHub repository URL.');
  return { owner: match[1], name: match[2] };
}

// Development checkout: <repo>/tools/agents → <repo>/registry.
// Installed copy: <tools>/agents → <tools>/registry.
export function registryCandidates(toolDir) {
  return [
    path.resolve(toolDir, '../../registry/projects.json'),
    path.resolve(toolDir, '../registry/projects.json'),
  ];
}

export function registryRepositories(file) {
  const registry = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const names = new Set();
  for (const project of registry.projects ?? [])
    for (const name of Object.values(project.repos ?? {})) if (name) names.add(name);
  return names;
}

export function findRegistry(toolDir) {
  const file = registryCandidates(toolDir).find((candidate) => fs.existsSync(candidate));
  if (!file) throw new Error('registry/projects.json not found next to the agent tools.');
  return file;
}

export function allowedRepository(remote, names) {
  const { owner, name } = parseOrigin(remote);
  if (owner !== OWNER || !names.has(name))
    throw new Error(`Origin repository ${owner}/${name} is not a registered project repository.`);
  return `${owner}/${name}`;
}

const defaults = Object.freeze({
  checkScript: 'check',
  databaseTables: null,
  browserCheckArgs: null,
  autoMerge: false,
});

// Unknown keys are rejected so a misspelled `autoMerge` cannot silently stay off or on.
export function validateRepoConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${REPO_CONFIG} must be a JSON object.`);
  for (const key of Object.keys(value))
    if (!['$schema', 'checkScript', 'database', 'browser', 'autoMerge'].includes(key))
      throw new Error(`${REPO_CONFIG}: unsupported key ${key}.`);
  const result = { ...defaults };
  if (value.checkScript !== undefined) {
    if (typeof value.checkScript !== 'string' || !scriptName.test(value.checkScript))
      throw new Error(`${REPO_CONFIG}: checkScript must be an npm script name.`);
    result.checkScript = value.checkScript;
  }
  if (value.database !== undefined) {
    const tables = value.database?.tables;
    if (
      !tables ||
      typeof tables !== 'object' ||
      Array.isArray(tables) ||
      Object.keys(value.database).some((key) => key !== 'tables') ||
      !Object.keys(tables).length
    )
      throw new Error(`${REPO_CONFIG}: database must be { "tables": { "<table>": ["<column>"] } }.`);
    for (const [table, columns] of Object.entries(tables))
      if (
        !identifier.test(table) ||
        !Array.isArray(columns) ||
        !columns.length ||
        columns.some((column) => typeof column !== 'string' || !identifier.test(column))
      )
        throw new Error(`${REPO_CONFIG}: invalid database table ${table}.`);
    result.databaseTables = structuredClone(tables);
  }
  if (value.browser !== undefined) {
    const args = value.browser?.checkArgs;
    if (
      Object.keys(value.browser ?? {}).some((key) => key !== 'checkArgs') ||
      !Array.isArray(args) ||
      !args.length ||
      args.some((arg) => typeof arg !== 'string')
    )
      throw new Error(`${REPO_CONFIG}: browser must be { "checkArgs": ["..."] }.`);
    result.browserCheckArgs = [...args];
  }
  if (value.autoMerge !== undefined) {
    if (typeof value.autoMerge !== 'boolean')
      throw new Error(`${REPO_CONFIG}: autoMerge must be true or false.`);
    result.autoMerge = value.autoMerge;
  }
  return result;
}

export function loadRepoConfig(root) {
  const file = path.join(root, REPO_CONFIG);
  if (!fs.existsSync(file)) return { ...defaults };
  return validateRepoConfig(JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')));
}
