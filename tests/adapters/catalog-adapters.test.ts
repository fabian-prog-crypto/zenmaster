import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import catalog from "../../src/adapters/catalog.json" with { type: "json" };
import { adapterRegistry } from "../../src/adapters/index.js";
import { Blocker } from "../../src/content/blocker.js";
import { classifyPage } from "../../src/content/classifier.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";

interface FixtureMetadata {
  adapterId: string;
  pageKind: "home" | "blocked-listing" | "watch" | "search";
  url: string;
}

describe("launch adapter contract", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("registers exactly the approved 50 adapters", () => {
    expect(adapterRegistry.ids()).toEqual(catalog.map((entry) => entry.id));
    expect(adapterRegistry.size).toBe(50);
  });

  for (const entry of catalog) {
    for (const fixtureName of ["home", "listing", "watch", "search"] as const) {
      it(`${entry.id} preserves intent and blocks ${fixtureName} recommendations`, async () => {
        const directory = path.join(process.cwd(), "tests/fixtures", entry.id);
        const html = await readFile(path.join(directory, `${fixtureName}.html`), "utf8");
        const metadata = JSON.parse(
          await readFile(path.join(directory, `${fixtureName}.meta.json`), "utf8")
        ) as FixtureMetadata;
        document.open();
        document.write(html);
        document.close();
        const adapter = adapterRegistry.getAdapterForHostname(new URL(metadata.url).hostname)!;
        const result = classifyPage(adapter, new URL(metadata.url), document);
        expect(result.pageKind).toBe(metadata.pageKind);
        const protection = new ProtectionRegistry();
        for (const selector of adapter.protectedSelectors[result.pageKind] ?? []) {
          for (const node of document.querySelectorAll(selector)) protection.register(node);
        }
        const blocker = new Blocker(adapter.id, document, protection);
        blocker.applyRules(document, [
          ...(adapter.hideSelectors[result.pageKind] ?? []),
          ...adapter.globalRecommendationSelectors
        ]);
        for (const node of document.querySelectorAll('[data-afb-expect="hide"]')) {
          expect(node.hasAttribute("data-afb-hidden")).toBe(true);
        }
        for (const node of document.querySelectorAll(
          '[data-afb-expect="preserve"], [data-afb-expect="player"]'
        )) {
          expect(node.hasAttribute("data-afb-hidden")).toBe(false);
          expect(node.closest("[data-afb-hidden]")).toBeNull();
        }
      });
    }
  }
});
