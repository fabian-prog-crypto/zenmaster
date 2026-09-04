import { beforeEach, describe, expect, it } from "vitest";
import {
  classifyGenericPage,
  detectGeneric,
  registerGenericProtectedRoots,
  scanRecommendations
} from "../../src/content/generic-detector.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";

describe("generic recommendation detection", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("recognizes and protects search before scoring", () => {
    document.body.innerHTML = `
      <form role="search"><input name="q"></form>
      <main id="search-results" aria-label="Search results">
        <a href="/video/1"></a><a href="/video/2"></a><a href="/video/3"></a><a href="/video/4"></a>
      </main>`;
    const context = classifyGenericPage(new URL("https://example.com/search?q=x"), document);
    const protection = new ProtectionRegistry();
    registerGenericProtectedRoots(document, context, protection);
    expect(context.pageKind).toBe("search");
    expect(detectGeneric(document, { pageKind: context.pageKind, protection })).toEqual([]);
  });

  it("requires a score of six and supports localized interface labels", () => {
    document.body.innerHTML = `
      <section aria-label="Empfohlen"><h2>Empfohlen</h2>
        <a href="/video/1"></a><a href="/video/2"></a><a href="/video/3"></a><a href="/video/4"></a>
      </section>`;
    const matches = detectGeneric(document, {
      pageKind: "unknown",
      protection: new ProtectionRegistry()
    });
    expect(matches).toHaveLength(1);
    expect(matches[0]!.score).toBeGreaterThanOrEqual(6);
  });

  it("protects a selected player and preserves ambiguous cards", () => {
    document.body.innerHTML = `
      <main><video controls></video></main>
      <section class="grid"><a href="/v/1"></a><a href="/v/2"></a><a href="/v/3"></a><a href="/v/4"></a></section>`;
    const context = classifyGenericPage(new URL("https://example.com/watch/1"), document);
    const protection = new ProtectionRegistry();
    registerGenericProtectedRoots(document, context, protection);
    expect(context.pageKind).toBe("watch");
    expect(detectGeneric(document, { pageKind: "unknown", protection })).toEqual([]);
  });

  it("never selects a page shell that contains the main page", () => {
    document.body.innerHTML = `<div class="recommendations page-shell">
      <main>
        <a href="/video/1"></a><a href="/video/2"></a>
        <a href="/video/3"></a><a href="/video/4"></a>
      </main>
    </div>`;
    expect(
      detectGeneric(document, {
        pageKind: "unknown",
        protection: new ProtectionRegistry()
      })
    ).toEqual([]);
  });

  it("recognizes an unlabeled repeated thumbnail group on a home page", () => {
    document.body.innerHTML = `<main><section id="rail" data-layout="rail">
      <div class="entry"><a href="/a1"><img alt=""></a></div>
      <div class="entry"><a href="/a2"><img alt=""></a></div>
      <div class="entry"><a href="/a3"><img alt=""></a></div>
    </section></main>`;

    const result = scanRecommendations(document, {
      pageKind: "home",
      protection: new ProtectionRegistry()
    });
    expect(result.observedMediaGroups).toBe(1);
    expect(result.matches.map((match) => match.candidate.id)).toEqual(["rail"]);
  });

  it("preserves the same unlabeled group on an unknown page", () => {
    document.body.innerHTML = `<section id="rail" data-layout="rail">
      <div class="entry"><a href="/a1"><img alt=""></a></div>
      <div class="entry"><a href="/a2"><img alt=""></a></div>
      <div class="entry"><a href="/a3"><img alt=""></a></div>
    </section>`;

    const result = scanRecommendations(document, {
      pageKind: "unknown",
      protection: new ProtectionRegistry()
    });
    expect(result.observedMediaGroups).toBe(1);
    expect(result.matches).toEqual([]);
  });
});
