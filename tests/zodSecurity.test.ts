import { describe, expect, it } from "vitest";
import { z } from "zod";

// GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404) affects zod < 4.6.6:
// parsing an oversized array with a size constraint accumulated one issue per
// failing element with no cap or early termination, letting an attacker exhaust
// memory. Fixed versions fail fast on the size check instead.
describe("zod security advisory (GHSA-mrhx-c7xc-m3w5)", () => {
  it("bounds the issue count when validating an oversized constrained array", () => {
    const schema = z.array(z.number()).max(100);
    const oversized = Array.from({ length: 100_000 }, (_, i) => `not-a-number-${i}`);

    const result = schema.safeParse(oversized);

    if (result.success) {
      throw new Error("expected oversized array parse to fail");
    }
    expect(result.error.issues.length).toBeLessThanOrEqual(1);
  });
});
