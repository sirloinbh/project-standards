// Builds the template variables for one sync target.
// Templates may use: project.* (app targets only), versions.*, platform.*, target.repo, target.profile,
// central.sha (the central commit being synced) and central.workflowSha (the last central commit that
// changed the reusable workflows; CI callers pin to it so unrelated central commits do not touch ci.yml).
// theme.color is the PWA background and bar colour: the dark background for apps with
// features.darkOnly (ADR-0011), otherwise the light one (ADR-0008). theme.offlineMeta and theme.offlineStyle
// are the offline page's colour lines: the renderer has no conditionals, so the variants live here.

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

export function buildVars(data, target, { centralSha, workflowSha = centralSha } = {}) {
  const project = target.project ? data.projects.projects.find((p) => p.name === target.project) : undefined;
  if (target.project && !project) throw new Error(`${target.repo}: project "${target.project}" is not in the registry`);
  return {
    project,
    versions: data.versions,
    platform: data.platform,
    target: { repo: target.repo, profile: target.profile },
    central: centralSha ? { sha: centralSha, workflowSha } : undefined,
    theme: { color: project?.features?.darkOnly ? '#0a0a0a' : '#ffffff', ...OFFLINE_THEME[project?.features?.darkOnly ? 'dark' : 'system'] },
  };
}
