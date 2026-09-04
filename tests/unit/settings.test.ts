import { beforeEach, describe, expect, it } from "vitest";
import catalog from "../../src/adapters/catalog.json" with { type: "json" };
import type { CatalogEntry } from "../../src/adapters/types.js";
import { renderSettings } from "../../src/settings/settings.js";

describe("settings", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it("renders 50 fixed sites and removal only for custom sites", () => {
    renderSettings(document.querySelector("#app")!, {
      catalog: catalog as readonly CatalogEntry[],
      customSites: [{ scheme: "https", hostname: "example.com", addedAt: 1 }],
      extensionVersion: "0.1.0",
      rulesetVersion: 1
    });
    expect(document.querySelectorAll("[data-built-in]")).toHaveLength(50);
    expect(document.querySelectorAll("[data-action='remove-site']")).toHaveLength(1);
    expect(document.body.textContent).toContain("Zen Master");
    expect(document.body.textContent).toContain("🧘");
    expect(document.body.textContent).toContain("Ruleset 1");
  });
});
