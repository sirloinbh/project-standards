// Builds the template variables for one sync target.
// Templates may use: project.* (app targets only), versions.*, platform.*, target.repo, target.profile,
// central.sha (the central commit being synced; pins the reusable CI workflow).

export function buildVars(data, target, { centralSha } = {}) {
  const project = target.project ? data.projects.projects.find((p) => p.name === target.project) : undefined;
  if (target.project && !project) throw new Error(`${target.repo}: project "${target.project}" is not in the registry`);
  return {
    project,
    versions: data.versions,
    platform: data.platform,
    target: { repo: target.repo, profile: target.profile },
    central: centralSha ? { sha: centralSha } : undefined,
  };
}
