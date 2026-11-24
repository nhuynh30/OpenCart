import { describe, it, expect } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import pkg from "../package.json";
import { registerSchema } from "./schemas";

describe("@hookform/resolvers 7.0.9 upgrade", () => {
  it("pins the upgraded resolver version", () => {
    expect(pkg.dependencies["@hookform/resolvers"]).toMatch(/^\^7\.0\.9$/);
  });

  it("keeps validating form schemas through the zod resolver", async () => {
    const resolver = zodResolver(registerSchema);

    const invalid = await resolver(
      { email: "not-an-email", password: "short", role: "BUYER" },
      undefined,
      { fields: {}, shouldUseNativeValidation: false },
    );

    expect(invalid.errors.email?.message).toBe("Enter a valid email address");
    expect(invalid.errors.password?.message).toBe(
      "Password must be at least 8 characters",
    );

    const valid = await resolver(
      { email: "buyer@example.com", password: "correct-horse", role: "BUYER" },
      undefined,
      { fields: {}, shouldUseNativeValidation: false },
    );

    expect(valid.errors).toEqual({});
  });
});
