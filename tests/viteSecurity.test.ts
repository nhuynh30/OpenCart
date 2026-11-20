import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// GHSA-587h-7wmj-h5pm affects vite < 8.3.3.
// This guard ensures the resolved vite is patched (>= 8.3.3).
function satisfiesFixed(version: string): boolean {
  const v = version.split(".").map((n) => Number(n));
  const fixed = [8, 3, 3];
  for (let i = 0; i < fixed.length; i++) {
    if (v[i] !== fixed[i]) {
      return v[i] > fixed[i];
    }
  }
  return true;
}

describe("vite security advisory (GHSA-587h-7wmj-h5pm)", () => {
  it("resolves vite to a patched version (>= 8.3.3)", () => {
    const pkg = require("vite/package.json") as { version: string };
    expect(satisfiesFixed(pkg.version)).toBe(true);
  });
});
