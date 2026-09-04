import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectGeneric } from "../../src/content/generic-detector.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";
import type { PageKind } from "../../src/shared/page-kind.js";

interface CorpusCase {
  id: string;
  expected: "hide" | "preserve";
  pageKind: PageKind;
  html: string;
}

describe("generic precision gate", () => {
  it("reaches at least 95% precision with no protected false positives", async () => {
    const storedCorpus = JSON.parse(
      await readFile(path.join(process.cwd(), "tests/fixtures/generic/corpus.json"), "utf8")
    ) as CorpusCase[];
    const corpus: CorpusCase[] = [
      ...storedCorpus,
      {
        id: "structural-thumbnail-navigation",
        expected: "preserve",
        pageKind: "home",
        html: `<nav><a href="/one"><img alt=""></a><a href="/two"><img alt=""></a><a href="/three"><img alt=""></a></nav>`
      },
      {
        id: "structural-search-results",
        expected: "preserve",
        pageKind: "search",
        html: `<main id="search-results" class="search-results"><section data-layout="rail">
          <div class="entry"><a href="/a1"><img alt=""></a></div>
          <div class="entry"><a href="/a2"><img alt=""></a></div>
          <div class="entry"><a href="/a3"><img alt=""></a></div>
        </section></main>`
      }
    ];
    let truePositives = 0;
    let falsePositives = 0;
    for (const item of corpus) {
      document.body.innerHTML = item.html;
      const protection = new ProtectionRegistry();
      for (const root of document.querySelectorAll("form[role='search'], .search-results")) {
        protection.register(root);
      }
      const hidden = detectGeneric(document, { pageKind: item.pageKind, protection }).length > 0;
      if (hidden && item.expected === "hide") truePositives += 1;
      if (hidden && item.expected === "preserve") falsePositives += 1;
    }
    const precision = truePositives / (truePositives + falsePositives);
    expect(precision).toBeGreaterThanOrEqual(0.95);
    expect(falsePositives).toBe(0);
  });
});
