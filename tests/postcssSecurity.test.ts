import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postcss from "postcss";

// GHSA-r28c-9q8g-f849 / CVE-2026-73646 affects postcss <= 8.5.17: a
// "sourceMappingURL" comment in the stylesheet could point outside the CSS
// file's directory, making postcss load an arbitrary ".map" file and expose
// its sourcesContent through result.map. 8.5.18 confines previous maps to the
// directory that contains the CSS file.
function mapJson(marker: string): string {
  return JSON.stringify({
    version: 3,
    sources: ["input.scss"],
    names: [],
    mappings: "",
    sourcesContent: [marker],
  });
}

describe("postcss security advisory (GHSA-r28c-9q8g-f849)", () => {
  it("does not load a previous source map from outside the CSS directory", async () => {
    const base = mkdtempSync(join(tmpdir(), "postcss-map-"));
    try {
      const projectDir = join(base, "app", "uploads");
      const outsideDir = join(base, "outside");
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(outsideDir, { recursive: true });
      writeFileSync(join(outsideDir, "secret.js.map"), mapJson("OUTSIDE-CONTENT"));
      writeFileSync(join(projectDir, "local.css.map"), mapJson("LOCAL-CONTENT"));

      const traversed = await postcss().process(
        "body { color: red }\n/*# sourceMappingURL=../../outside/secret.js.map */",
        {
          from: join(projectDir, "input.css"),
          to: join(projectDir, "output.css"),
        },
      );
      const emitted = traversed.map ? traversed.map.toString() : "";
      expect(emitted).not.toContain("OUTSIDE-CONTENT");

      // A map that sits beside the stylesheet is still loaded, so the fix
      // confines path resolution without disabling previous maps entirely.
      const local = await postcss().process(
        "body { color: blue }\n/*# sourceMappingURL=local.css.map */",
        {
          from: join(projectDir, "local.css"),
          to: join(projectDir, "local.out.css"),
        },
      );
      expect(local.map ? local.map.toString() : "").toContain("LOCAL-CONTENT");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
