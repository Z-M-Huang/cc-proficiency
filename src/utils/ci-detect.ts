/**
 * Detect if the current environment is CI/CD.
 * CI sessions should be excluded from proficiency scoring.
 */
export function isCIEnvironment(): boolean {
  const env = process.env;
  return !!(
    env.CI === "true" ||
    env.GITHUB_ACTIONS === "true" ||
    env.GITLAB_CI === "true" ||
    env.JENKINS_URL ||
    env.CODESPACES === "true" ||
    env.BUILDKITE === "true" ||
    env.CIRCLECI === "true" ||
    env.TRAVIS === "true"
  );
}
