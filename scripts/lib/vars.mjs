// Builds the template variables for one sync target.
// Templates may use: project.* and service.host (app targets only; the app's subdomain, ADR-0012) and service.bodyLimit (the /api/ request body limit, #589), versions.*, platform.*, target.repo, target.profile,
// apps.list (the switcher's app entries, #561),
// central.sha (the central commit being synced) and central.workflowSha (the last central commit that
// changed the reusable workflows; CI callers pin to it so unrelated central commits do not touch ci.yml).
// theme.color is the PWA background and bar colour: the dark background for apps with
// features.darkOnly (ADR-0011), otherwise the light one (ADR-0008). theme.offlineMeta and theme.offlineStyle
// are the offline page's colour lines: the renderer has no conditionals, so the variants live here.
import { serviceHost } from './registry.mjs';

const OFFLINE_THEME = {
  dark: {
    offlineMeta: '    <meta name="theme-color" content="#0a0a0a" />',
    offlineStyle: '      :root { color-scheme: dark; --bg: #0a0a0a; --fg: #fafafa; --muted: #a3a3a3; }',
  },
  system: {
    offlineMeta: '    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />\n    <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />',
    offlineStyle: '      :root { color-scheme: light dark; --bg: #ffffff; --fg: #0a0a0a; --muted: #737373; }\n      @media (prefers-color-scheme: dark) { :root { --bg: #0a0a0a; --fg: #fafafa; --muted: #a3a3a3; } }',
  },
};

/** The app entries for the switcher (#561) as TypeScript array lines; empty while there is no root domain. */
export function appsList(data) {
  // Display names are registry data; escape what a single-quoted string cannot hold.
  const quote = (v) => `'${String(v).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  return data.projects.projects
    .filter((p) => p.status === 'active' && serviceHost(p, data.platform))
    .map((p) => `  { name: ${quote(p.name)}, label: ${quote(p.displayName)}, href: ${quote(`https://${serviceHost(p, data.platform)}/`)} },`)
    .join('\n');
}

export function buildVars(data, target, { centralSha, workflowSha = centralSha } = {}) {
  const project = target.project ? data.projects.projects.find((p) => p.name === target.project) : undefined;
  if (target.project && !project) throw new Error(`${target.repo}: project "${target.project}" is not in the registry`);
  return {
    project,
    versions: data.versions,
    platform: data.platform,
    service: project ? { host: serviceHost(project, data.platform), bodyLimit: `${project.service.apiBodyMb ?? 1}m` } : undefined,
    apps: { list: appsList(data) },
    target: { repo: target.repo, profile: target.profile },
    central: centralSha ? { sha: centralSha, workflowSha } : undefined,
    theme: { color: project?.features?.darkOnly ? '#0a0a0a' : '#ffffff', ...OFFLINE_THEME[project?.features?.darkOnly ? 'dark' : 'system'] },
  };
}
