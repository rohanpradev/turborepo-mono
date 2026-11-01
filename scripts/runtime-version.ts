// Keep the doctor's warning for requirements without a concrete version.
// Bun's permissive parser can treat unrecognized range text as '*'.
export const satisfiesRuntimeVersion = (
  actualVersion: string | null,
  requiredRange?: string,
): boolean | null => {
  if (
    !actualVersion ||
    !requiredRange ||
    !/\d+\.\d+\.\d+/.test(requiredRange)
  ) {
    return null;
  }

  return Bun.semver.satisfies(actualVersion.replace(/^v/, ""), requiredRange);
};
