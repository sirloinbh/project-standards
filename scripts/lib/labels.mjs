// Keeps the std-backlog issue labels of a target repository equal to templates/common/labels.json.
// Labels are created or updated, never deleted: labels the central list does not know are left alone.
import fs from 'node:fs';
import path from 'node:path';

export const LABELS_PATH = 'templates/common/labels.json';

/** Reads and checks the central label list: [{ name, color, description }]. */
export function loadLabels(root) {
  const { labels } = JSON.parse(fs.readFileSync(path.join(root, LABELS_PATH), 'utf8'));
  const seen = new Set();
  for (const label of labels) {
    const where = `${LABELS_PATH} ${label.name ?? '(no name)'}`;
    if (typeof label.name !== 'string' || !label.name.trim()) throw new Error(`${where}: name is required`);
    if (!/^[0-9a-f]{6}$/.test(label.color ?? '')) throw new Error(`${where}: color must be 6 lowercase hex digits without #`);
    if (typeof label.description !== 'string' || label.description.length > 100) throw new Error(`${where}: description must be a string of at most 100 characters`);
    // GitHub label names are case-insensitive.
    const key = label.name.toLowerCase();
    if (seen.has(key)) throw new Error(`${where}: duplicate name`);
    seen.add(key);
  }
  return labels;
}

/**
 * Compares the central labels with a repository's labels (as the GitHub API returns them).
 * Returns { create: [label], update: [{ name, label, changes }], unchanged: [name], unmanaged: [name] }.
 * `changes` lists what differs: "name", "color", "description".
 */
export function planLabels(desired, existing) {
  const byKey = new Map(existing.map((l) => [l.name.toLowerCase(), l]));
  const plan = { create: [], update: [], unchanged: [], unmanaged: [] };
  for (const label of desired) {
    const current = byKey.get(label.name.toLowerCase());
    if (!current) {
      plan.create.push(label);
      continue;
    }
    const changes = [];
    if (current.name !== label.name) changes.push('name');
    if ((current.color ?? '').toLowerCase() !== label.color) changes.push('color');
    if ((current.description ?? '') !== label.description) changes.push('description');
    if (changes.length) plan.update.push({ name: current.name, label, changes });
    else plan.unchanged.push(label.name);
  }
  const managed = new Set(desired.map((l) => l.name.toLowerCase()));
  plan.unmanaged = existing.filter((l) => !managed.has(l.name.toLowerCase())).map((l) => l.name);
  return plan;
}

/** One line for logs and dry-run output. Each field may be a list or a count. */
export function describeLabelPlan(plan) {
  const n = (x) => (Array.isArray(x) ? x.length : x);
  const parts = [`라벨 생성 ${n(plan.create)}`, `갱신 ${n(plan.update)}`, `그대로 ${n(plan.unchanged)}`];
  if (plan.unmanaged.length) parts.push(`관리 밖 ${plan.unmanaged.length}(지우지 않음)`);
  return parts.join(', ');
}

async function listLabels(api, repo) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await api('GET', `/repos/${repo}/labels?per_page=100&page=${page}`);
    if (!batch) throw new Error(`${repo} labels are not readable by the App`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

/**
 * Creates and updates the central labels in one repository. With `dryRun` it only reads and returns the plan.
 * Needs the App's Issues write permission (ADR-0002). Returns the plan.
 */
export async function syncLabels({ api, repo, labels, dryRun = false }) {
  const plan = planLabels(labels, await listLabels(api, repo));
  if (dryRun) return plan;
  for (const { name, color, description } of plan.create) {
    await api('POST', `/repos/${repo}/labels`, { name, color, description });
  }
  for (const { name, label } of plan.update) {
    await api('PATCH', `/repos/${repo}/labels/${encodeURIComponent(name)}`, { new_name: label.name, color: label.color, description: label.description });
  }
  return plan;
}
