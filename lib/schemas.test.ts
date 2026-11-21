import { describe, it, expect } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import pkg from "../package.json";
import { registerSchema } from "./schemas";

describe("zod resolver", () => {
  it("keeps validating form schemas after the @hookform/resolvers v7 upgrade", async () => {
    expect(pkg.dependencies["@hookform/resolvers"]).toMatch(/^\^7\./);

    const resolver = zodResolver(registerSchema);
    const result = await resolver(
      { email: "not-an-email", password: "short", role: "BUYER" },
      undefined,
      { fields: {}, shouldUseNativeValidation: false },
    );

    expect(result.errors.email?.message).toBe("Enter a valid email address");
    expect(result.errors.password?.message).toBe("Password must be at least 8 characters");
  });
});
