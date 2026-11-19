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

// What the shared deploy files read as project.deploy (#696). Apps and services differ only in these values:
// unit is the systemd unit prefix (an app's DB name, a service's own name, as already installed on the server),
// units are the timers install-backup.sh installs, images are pruned after a deploy, and migrate says whether
// remote-deploy.sh runs the migrations as a step (apps) or the image starts them itself (services). pull is `on` when the
// server pulls the images CI pushed instead of building them (ADR-0023, #755); off for everyone until the quota is confirmed (#756).
function deployVars(project, kind) {
  if (kind === 'service') {
    return { unit: project.name, pull: 'off', registry: 'ghcr.io/sirloinbh', registryUser: 'sirloinbh', units: 'backup restore-check', images: `${project.name}-backend`, migrate: 'image' };
  }
  return { unit: project.db.name, pull: 'off', registry: 'ghcr.io/sirloinbh', registryUser: 'sirloinbh', units: 'backup restore-check health report', images: `${project.db.name}-backend ${project.db.name}-frontend`, migrate: 'step' };
}

/** The project a target renders as: an app from the registry, or a shared service (shared-auth, shared-ai) with the same fields the deploy files read. */
function targetProject(data, target) {
  if (target.project) {
    const app = data.projects.projects.find((p) => p.name === target.project);
    if (!app) throw new Error(`${target.repo}: project "${target.project}" is not in the registry`);
    return { ...app, deploy: deployVars(app, 'app') };
  }
  const service = (data.projects.sharedServices ?? []).find((s) => s.repo === target.repo.split('/').pop());
  if (!service) return undefined;
  return { ...service, repos: { umbrella: service.repo }, features: { claude: false }, deploy: deployVars(service, 'service') };
}

export function buildVars(data, target, { centralSha, workflowSha = centralSha } = {}) {
  const project = targetProject(data, target);
  return {
    project,
    versions: data.versions,
    platform: data.platform,
    service: target.project ? { host: serviceHost(project, data.platform), bodyLimit: `${project.service.apiBodyMb ?? 1}m` } : undefined,
    apps: { list: appsList(data) },
    target: { repo: target.repo, profile: target.profile },
    central: centralSha ? { sha: centralSha, workflowSha } : undefined,
    theme: { color: project?.features?.darkOnly ? '#0a0a0a' : '#ffffff', ...OFFLINE_THEME[project?.features?.darkOnly ? 'dark' : 'system'] },
  };
}
