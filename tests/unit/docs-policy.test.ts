import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("documentation policy", () => {
  it("documents behavior, privacy, and every launch adapter", async () => {
    const [readme, privacy, changelog, smoke] = await Promise.all([
      readFile("README.md", "utf8"),
      readFile("PRIVACY.md", "utf8"),
      readFile("CHANGELOG.md", "utf8"),
      readFile("docs/release/manual-smoke.md", "utf8")
    ]);
    expect(readme).toContain("Block recommendations on this site");
    expect(readme).toContain("Search results remain available");
    expect(privacy).toContain("No telemetry");
    expect(privacy).toContain("chrome.storage.local");
    expect(changelog).toContain("0.1.1");
    expect(changelog).toContain("Ruleset 1");
    expect(smoke.match(/^\|\s*`[^`]+`\s*\|/gm) ?? []).toHaveLength(50);
  });
});
