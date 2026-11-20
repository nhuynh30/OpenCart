import { describe, expect, it } from "vitest";
import { Schema } from "effect";

// GHSA-7589-6fvf-x4pw (CVE-2026-121707) affects effect <= 3.22.0:
// Schema.TemplateLiteral compiles every Schema.String span to an ambiguous
// lazy wildcard, so decoding/matching a long non-matching input backtracks
// cubically and blocks the event loop. effect 3.22.1 scans templates whose
// spans are all Schema.String linearly instead.
describe("effect security advisory (GHSA-7589-6fvf-x4pw)", () => {
  it("matches a long non-matching template literal input in linear time", () => {
    const schema = Schema.TemplateLiteral(
      Schema.String,
      ":",
      Schema.String,
      ":",
      Schema.String,
      "X",
    );

    // Non-matching input: separators only, with no trailing "X".
    const input = ":".repeat(4000);

    const start = performance.now();
    const matched = Schema.is(schema)(input);
    const elapsedMs = performance.now() - start;

    expect(matched).toBe(false);
    // 3.20.0 backtracks cubically (~3s for this input); 3.22.1 scans
    // linearly (~0ms). The generous bound keeps the guard stable across CI.
    expect(elapsedMs).toBeLessThan(1000);
  }, 10_000);
});
