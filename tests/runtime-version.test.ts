import { describe, expect, it } from "bun:test";
import { satisfiesRuntimeVersion } from "../scripts/runtime-version";

describe("runtime engine requirements", () => {
  it("compares runtime versions including Node's v prefix", () => {
    expect(satisfiesRuntimeVersion("v24.22.1", ">=24.22.1")).toBe(true);
    expect(satisfiesRuntimeVersion("24.22.0", ">=24.22.1")).toBe(false);
    expect(satisfiesRuntimeVersion("1.4.4+build.1", ">=1.4.4")).toBe(true);
  });

  it("rejects prereleases unless the engine range explicitly allows them", () => {
    expect(satisfiesRuntimeVersion("1.4.4-canary.1", ">=1.4.4")).toBe(false);
    expect(satisfiesRuntimeVersion("1.4.5-canary.1", ">=1.4.4")).toBe(false);
    expect(satisfiesRuntimeVersion("1.4.4-canary.1", ">=1.4.4-canary.0")).toBe(
      true,
    );
  });

  it("honors bounded ranges and alternatives instead of their first version", () => {
    const requirement = ">=24.22.1 <25 || >=26.6.0 <27";
    expect(satisfiesRuntimeVersion("24.22.1", requirement)).toBe(true);
    expect(satisfiesRuntimeVersion("25.0.0", requirement)).toBe(false);
    expect(satisfiesRuntimeVersion("26.6.0", requirement)).toBe(true);
    expect(satisfiesRuntimeVersion("27.0.0", requirement)).toBe(false);
    expect(satisfiesRuntimeVersion("2.0.0", "^1.4.4")).toBe(false);
  });

  it("fails invalid runtime versions", () => {
    for (const version of ["unknown", "1.4.4.1", "1.4.4 junk"]) {
      expect(satisfiesRuntimeVersion(version, ">=1.4.4")).toBe(false);
    }
  });

  it("preserves warnings for missing versions and non-version requirements", () => {
    expect(satisfiesRuntimeVersion(null, ">=1.4.4")).toBeNull();
    expect(satisfiesRuntimeVersion("", ">=1.4.4")).toBeNull();
    for (const requirement of [
      undefined,
      "",
      "invalid",
      "invalid1",
      "banana 1",
      "*",
      "x",
    ]) {
      expect(satisfiesRuntimeVersion("1.4.4", requirement)).toBeNull();
    }
  });
});
