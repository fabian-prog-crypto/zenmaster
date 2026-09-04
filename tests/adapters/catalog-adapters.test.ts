import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import catalog from "../../src/adapters/catalog.json" with { type: "json" };
import { adapterRegistry } from "../../src/adapters/index.js";
import { createContentKernel } from "../../src/content/bootstrap.js";

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
        const url = new URL(metadata.url);
        expect(adapterRegistry.getAdapterForHostname(url.hostname)?.id).toBe(entry.id);
        const kernel = createContentKernel({
          page: document,
          url,
          registry: adapterRegistry,
          observe: false,
          inFrame: false
        });
        kernel.start();
        expect(kernel.getStatus().pageKind).toBe(metadata.pageKind);
        for (const node of document.querySelectorAll('[data-afb-expect="hide"]')) {
          expect(node.hasAttribute("data-afb-hidden")).toBe(true);
        }
        for (const node of document.querySelectorAll(
          '[data-afb-expect="preserve"], [data-afb-expect="player"]'
        )) {
          expect(node.hasAttribute("data-afb-hidden")).toBe(false);
          expect(node.closest("[data-afb-hidden]")).toBeNull();
        }
        for (const node of document.querySelectorAll('[data-afb-expect="neutralize"]')) {
          expect(node.hasAttribute("data-afb-link-neutralized")).toBe(true);
          expect(node.getAttribute("aria-disabled")).toBe("true");
          expect(node.getAttribute("tabindex")).toBe("-1");
        }
        kernel.stop();
      });
    }
  }
});
