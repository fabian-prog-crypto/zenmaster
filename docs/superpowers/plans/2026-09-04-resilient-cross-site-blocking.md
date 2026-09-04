# Resilient Cross-Site Blocking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Zen Master 0.1.4 with verified domain-family/subdomain coverage, structural recommendation detection on every supported adapter, a NoodleMagazine regression fix, and uploader/creator-path blocking.

**Architecture:** Replace exact adapter hostnames with catalog-owned domain roots and generate bounded Chrome wildcard patterns from those roots. Keep exact selectors as the first blocking layer, then run a DOM-structural detector under page-class-specific protection; a focused creator guard hides uploader modules and neutralizes residual profile links. All processing remains local, mutation-scoped, reversible on SPA navigation, and reflected in the existing per-tab card count.

**Tech Stack:** Chrome Manifest V3, TypeScript 6, native DOM APIs, esbuild, Vitest with Happy DOM, Playwright Chromium extension tests, Node.js 22 scripts.

**Spec:** `docs/superpowers/specs/2026-09-04-domain-family-structural-creator-blocking-design.md`

## Global Constraints

- Target release version is exactly `0.1.4`.
- Support exactly the existing 50 adapter IDs; this release changes their domain and detection behavior rather than adding platforms.
- Built-in access is HTTPS and limited to explicitly declared domain roots; never request or register `<all_urls>`.
- User-added sites remain exact-origin permissions and are removable only from Settings.
- Never use hostname substring matching; use exact root or dot-boundary suffix matching.
- Search forms/results, the selected player, and user-owned library roots have absolute protection precedence.
- Do not analyze or persist media, images, titles, usernames, URLs, queries, or browsing history.
- Do not add pause, reveal, per-site disable, remote rules, telemetry, or network requests.
- Do not replace a page with a blank document or a creator-blocking interstitial.
- Fixtures contain structural placeholders only—no explicit text, usernames, thumbnails, or media.
- All behavior changes follow red-green-refactor and end with the complete `npm run verify` release gate.

---

## File Structure

### New focused units

- `src/adapters/domain-roots.ts` — normalizes domain roots, performs label-boundary hostname matching, validates ownership, and generates runtime HTTPS match patterns.
- `scripts/catalog-domain-roots.mjs` — Node build/check equivalent for catalog validation and manifest pattern generation.
- `scripts/audit-domain-coverage.mjs` — prints and validates the 50-adapter domain coverage matrix without fetching page content.
- `src/content/media-structure.ts` — identifies likely media anchors, repeated card units, and bounded card groups from DOM structure.
- `src/content/creator-guard.ts` — identifies watch-page creator surfaces and creator/profile links without applying mutations.
- `src/content/link-neutralizer.ts` — reversibly disables only creator links selected by the creator guard.
- `tests/unit/domain-roots.test.ts` — domain normalization, suffix safety, collision, and 50-adapter coverage tests.
- `tests/unit/media-structure.test.ts` — structural card and group recognition tests.
- `tests/unit/creator-guard.test.ts` — uploader-surface and creator-link selection tests.
- `tests/unit/link-neutralizer.test.ts` — click, keyboard focus, and route restoration tests.

### Existing files changed

- `src/adapters/catalog.json`, `src/adapters/types.ts`, `src/adapters/define-adapter.ts`, `src/adapters/site-factory.ts`, `src/adapters/registry.ts` — domain-root schema and runtime adapter resolution.
- `src/background/registrations.ts`, `src/background/permissions.ts` — wildcard registrations and built-in subdomain recognition.
- `scripts/build.mjs`, `scripts/check-package.mjs`, `package.json`, `package-lock.json` — catalog audit, manifest generation, scripts, and release version.
- `src/content/generic-detector.ts`, `src/content/recommendation-counter.ts`, `src/content/blocker.ts`, `src/content/bootstrap.ts`, `src/adapters/families/profiles.ts` — shared structural pipeline, deduplication, creator rules, status, and counting.
- `tests/fixtures/noodlemagazine/*.html`, `tests/adapters/catalog-adapters.test.ts`, relevant `tests/unit/*.test.ts`, `tests/performance/*.test.ts`, and `tests/extension/known-site.spec.ts` — regressions, contracts, precision, performance, and browser behavior.
- `src/manifest.base.json`, `README.md` — release version and user-visible coverage wording.

---

### Task 1: Model verified domain roots and resolve all subdomains safely

**Files:**

- Create: `src/adapters/domain-roots.ts`
- Create: `tests/unit/domain-roots.test.ts`
- Modify: `src/adapters/catalog.json`
- Modify: `src/adapters/types.ts`
- Modify: `src/adapters/define-adapter.ts`
- Modify: `src/adapters/site-factory.ts`
- Modify: `src/adapters/registry.ts`
- Modify: `tests/unit/adapter-registry.test.ts`
- Modify: `tests/unit/catalog.test.ts`

**Interfaces:**

- Produces: `normalizeDomainRoot(value: string): string`.
- Produces: `hostnameMatchesDomainRoot(hostname: string, root: string): boolean`.
- Produces: `validateDomainOwnership(adapters: readonly SiteAdapter[]): void`.
- Changes `CatalogEntry.aliases` to `CatalogEntry.domainRoots: string[]`.
- Changes `SiteAdapter.hostnames` to `SiteAdapter.domainRoots: readonly string[]`.
- Preserves: `AdapterRegistry.getAdapterForHostname(hostname: string): SiteAdapter | undefined`.

- [ ] **Step 1: Write failing root-matching and registry tests**

```ts
it("matches a verified root and arbitrary subdomains at label boundaries", () => {
  expect(hostnameMatchesDomainRoot("xhamster.desi", "xhamster.desi")).toBe(true);
  expect(hostnameMatchesDomainRoot("ge.xhamster.desi", "xhamster.desi")).toBe(true);
  expect(hostnameMatchesDomainRoot("a.b.xhamster.desi.", "XHAMSTER.DESI")).toBe(true);
  expect(hostnameMatchesDomainRoot("xhamster.desi.example", "xhamster.desi")).toBe(false);
  expect(hostnameMatchesDomainRoot("notxhamster.desi", "xhamster.desi")).toBe(false);
});

it("resolves every catalog root and a regional subdomain", () => {
  for (const entry of catalog) {
    for (const root of entry.domainRoots) {
      expect(adapterRegistry.getAdapterForHostname(root)?.id).toBe(entry.id);
      expect(adapterRegistry.getAdapterForHostname(`region.${root}`)?.id).toBe(entry.id);
    }
  }
  expect(adapterRegistry.getAdapterForHostname("ge.xhamster.desi")?.id).toBe("xhamster");
});

it("rejects roots owned by two adapters", () => {
  const first = defineAdapter({ ...adapterInput, id: "first", domainRoots: ["example.com"] });
  const second = defineAdapter({ ...adapterInput, id: "second", domainRoots: ["sub.example.com"] });
  expect(() => createAdapterRegistry([first, second])).toThrow("Overlapping domain roots");
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run tests/unit/domain-roots.test.ts tests/unit/adapter-registry.test.ts tests/unit/catalog.test.ts`

Expected: FAIL because `domain-roots.ts` and `domainRoots` do not exist and `ge.xhamster.desi` does not resolve.

- [ ] **Step 3: Implement domain-root normalization and ownership validation**

```ts
export function normalizeDomainRoot(value: string): string {
  const root = value.trim().toLowerCase().replace(/\.$/, "");
  if (!root || root.includes("/") || root.startsWith(".") || root.endsWith(".")) {
    throw new Error(`Invalid domain root: ${value}`);
  }
  return root;
}

export function hostnameMatchesDomainRoot(hostname: string, root: string): boolean {
  const host = normalizeDomainRoot(hostname);
  const normalizedRoot = normalizeDomainRoot(root);
  return host === normalizedRoot || host.endsWith(`.${normalizedRoot}`);
}

export function rootsOverlap(first: string, second: string): boolean {
  return hostnameMatchesDomainRoot(first, second) || hostnameMatchesDomainRoot(second, first);
}
```

`validateDomainOwnership` must normalize every root, reject duplicates/nesting within one adapter, and reject equal/nested roots across different adapters with an error that includes both adapter IDs and roots.

- [ ] **Step 4: Migrate the catalog and adapter contract**

Use `domainRoots: [primaryHostname]` for ordinary entries. Apply these exact multi-root values:

```json
{
  "id": "pornhub",
  "primaryHostname": "pornhub.com",
  "domainRoots": ["pornhub.com", "pornhub.org"]
}
{
  "id": "xhamster",
  "primaryHostname": "xhamster.com",
  "domainRoots": ["xhamster.com", "xhamster.desi"]
}
{
  "id": "txxx",
  "primaryHostname": "txxx.com",
  "domainRoots": ["txxx.com", "txxx.tube"]
}
```

Retain the existing alternate roots for HDZog, TheGay, and ShemaleZ. `createCatalogAdapter` passes `entry.domainRoots`, and `defineAdapter` normalizes/freezes those roots. The registry validates ownership once and resolves a hostname through dot-boundary matching.

- [ ] **Step 5: Run the domain and existing adapter tests and verify GREEN**

Run: `npx vitest run tests/unit/domain-roots.test.ts tests/unit/adapter-registry.test.ts tests/unit/catalog.test.ts tests/adapters/catalog-adapters.test.ts`

Expected: PASS with exactly 50 adapters, `ge.xhamster.desi` mapped to `xhamster`, and lookalikes unmapped.

- [ ] **Step 6: Commit the domain model**

```bash
git add src/adapters tests/unit/domain-roots.test.ts tests/unit/adapter-registry.test.ts tests/unit/catalog.test.ts
git commit -m "feat: resolve verified site domain families"
```

---

### Task 2: Generate bounded wildcard registrations and audit all 50 adapters

**Files:**

- Create: `scripts/catalog-domain-roots.mjs`
- Create: `scripts/audit-domain-coverage.mjs`
- Modify: `src/adapters/domain-roots.ts`
- Modify: `src/background/registrations.ts`
- Modify: `src/background/permissions.ts`
- Modify: `scripts/build.mjs`
- Modify: `scripts/check-package.mjs`
- Modify: `package.json`
- Modify: `tests/unit/registrations.test.ts`
- Modify: `tests/unit/permissions.test.ts`
- Modify: `tests/unit/build.test.ts`
- Modify: `tests/unit/package-policy.test.ts`

**Interfaces:**

- Produces: `httpsPatternForDomainRoot(root: string): string` in runtime TypeScript.
- Produces: `domainRootsFromCatalog(catalog): string[]` and `hostPatternsFromCatalog(catalog): string[]` for Node scripts.
- Produces: `npm run audit:domains` with no network activity.
- Consumes: `CatalogEntry.domainRoots` and `hostnameMatchesDomainRoot` from Task 1.

- [ ] **Step 1: Write failing registration, permission, and build tests**

```ts
it("registers one bounded wildcard pattern per verified root", () => {
  const patterns = builtInPatterns();
  expect(patterns).toContain("https://*.xhamster.desi/*");
  expect(patterns).toContain("https://*.pornhub.org/*");
  expect(patterns).not.toContain("https://ge.xhamster.desi/*");
  expect(patterns).not.toContain("<all_urls>");
  expect(patterns).not.toContain("https://*/*");
  expect(new Set(patterns).size).toBe(patterns.length);
});

it("recognizes a built-in regional subdomain without requesting permission", async () => {
  const api = createChromeFake();
  const result = await addCustomSite(api, {
    tabId: 7,
    origin: "https://ge.xhamster.desi/watch/example"
  });
  expect(result).toEqual({ ok: true, alreadyProtected: true, reloadRequired: false });
  expect(api.calls).not.toContainEqual(expect.stringContaining("permissions.request"));
});
```

Update the build assertion to require the exact sorted set derived from catalog roots instead of the obsolete hard-coded count of 105. Leave the release-version assertion at 0.1.3 until Task 7 performs the tested version bump.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run tests/unit/registrations.test.ts tests/unit/permissions.test.ts tests/unit/build.test.ts tests/unit/package-policy.test.ts`

Expected: FAIL because registrations are exact-host patterns, the popup path requests `ge.xhamster.desi` as custom, and the build still enforces 105 patterns.

- [ ] **Step 3: Implement wildcard pattern generation and built-in recognition**

```ts
export function httpsPatternForDomainRoot(root: string): string {
  return `https://*.${normalizeDomainRoot(root)}/*`;
}
```

`builtInPatterns()` maps every catalog root through this function. `addCustomSite()` resolves the requested hostname through the adapter registry or a shared root matcher before asking Chrome for permission. Keep custom registration patterns exact.

Create `scripts/catalog-domain-roots.mjs` with matching validation and:

```js
export function hostPatternsFromCatalog(catalog) {
  const roots = domainRootsFromCatalog(catalog);
  return roots.map((root) => `https://*.${root}/*`).sort();
}
```

Both `build.mjs` and `check-package.mjs` import this helper. The build asserts 50 unique adapter IDs, nonempty roots, no cross-adapter overlap, and unique output patterns; it no longer asserts a literal pattern count.

- [ ] **Step 4: Add the deterministic domain audit command**

`scripts/audit-domain-coverage.mjs` reads `src/adapters/catalog.json`, validates it, and prints one line per adapter containing its ID and comma-separated roots followed by a summary:

```js
const patterns = hostPatternsFromCatalog(catalog);
for (const entry of catalog) {
  console.log(`${entry.id}: ${entry.domainRoots.join(", ")}`);
}
console.log(`Domain coverage passed: ${catalog.length} adapters, ${patterns.length} roots.`);
```

Add `"audit:domains": "node scripts/audit-domain-coverage.mjs"` to package scripts. Do not make HTTP requests.

- [ ] **Step 5: Run audits and tests and verify GREEN**

Run: `npm run audit:domains`

Expected: PASS summary for 50 adapters and a root count equal to the generated manifest-pattern count.

Run: `npx vitest run tests/unit/registrations.test.ts tests/unit/permissions.test.ts tests/unit/build.test.ts tests/unit/package-policy.test.ts`

Expected: PASS with bounded wildcard patterns and no custom permission request for supported subdomains.

- [ ] **Step 6: Commit wildcard registrations and audits**

```bash
git add src/background src/adapters/domain-roots.ts scripts package.json tests/unit/registrations.test.ts tests/unit/permissions.test.ts tests/unit/build.test.ts tests/unit/package-policy.test.ts
git commit -m "feat: register all verified site subdomains"
```

---

### Task 3: Recognize repeated media-card structures and count them consistently

**Files:**

- Create: `src/content/media-structure.ts`
- Create: `tests/unit/media-structure.test.ts`
- Modify: `src/content/recommendation-counter.ts`
- Modify: `tests/unit/recommendation-counter.test.ts`

**Interfaces:**

- Produces: `isLikelyMediaAnchor(anchor: HTMLAnchorElement): boolean`.
- Produces: `findMediaCardGroups(root: Document | Element | ShadowRoot): readonly MediaCardGroup[]`.
- Produces type: `MediaCardGroup = { container: Element; cards: readonly Element[] }`.
- Preserves: `countRecommendationCards(roots, selectors?): number`.

- [ ] **Step 1: Write failing structure tests using non-semantic Noodle-style markup**

```ts
it("recognizes repeated thumbnail cards without video words in classes or URLs", () => {
  document.body.innerHTML = `<section data-layout="rail">
    <div class="entry"><a href="/a1"><img alt=""></a><span class="duration">01:00</span></div>
    <div class="entry"><a href="/a2"><img alt=""></a><span class="duration">02:00</span></div>
    <div class="entry"><a href="/a3"><img alt=""></a><span class="duration">03:00</span></div>
  </section>`;
  const groups = findMediaCardGroups(document);
  expect(groups).toHaveLength(1);
  expect(groups[0]?.container).toBe(document.querySelector("section"));
  expect(groups[0]?.cards).toHaveLength(3);
});

it("does not treat navigation icons as a media-card group", () => {
  document.body.innerHTML = `<nav>
    <a href="/a"><img alt=""></a><a href="/b"><img alt=""></a><a href="/c"><img alt=""></a>
  </nav>`;
  expect(findMediaCardGroups(document)).toEqual([]);
});

it("counts one repeated card once even when it contains multiple links", () => {
  const root = document.querySelector("section")!;
  expect(countRecommendationCards([root])).toBe(3);
});
```

- [ ] **Step 2: Run structure and counter tests and verify RED**

Run: `npx vitest run tests/unit/media-structure.test.ts tests/unit/recommendation-counter.test.ts`

Expected: FAIL because `media-structure.ts` does not exist and the counter ignores thumbnail-only slug links.

- [ ] **Step 3: Implement bounded media-anchor and card grouping**

Use these constants and selection rules:

```ts
const VIDEO_PATH = /(?:\/view_video\.php|\/videos?(?:\/|$)|\/watch(?:\/|$)|\/v\/)/i;
const THUMBNAIL = "img, picture, video[poster], [class*='thumb' i], [data-thumbnail]";
const CARD =
  "article, li, [class*='card' i], [class*='item' i], [class*='entry' i], [class*='thumb' i], [data-video-id]";
const CANDIDATE = "section, aside, [role='complementary'], [class], [id], [data-layout]";
const EXCLUDED = "nav, header, footer, form, [role='navigation']";

export function isLikelyMediaAnchor(anchor: HTMLAnchorElement): boolean {
  const path = new URL(anchor.href, anchor.ownerDocument.baseURI).pathname;
  return VIDEO_PATH.test(path) || anchor.querySelector(THUMBNAIL) !== null;
}
```

For each candidate, examine at most 80 anchors and resolve each anchor to the nearest `CARD` descendant inside that candidate, falling back to the candidate's direct child that contains the anchor. Require at least three distinct cards and reject excluded contexts. Deduplicate identical/nested groups and prefer the smallest qualifying container that contains all cards.

- [ ] **Step 4: Reuse structural cards in recommendation counting**

The counter first applies adapter selectors. For roots without selector-recognized cards, call `findMediaCardGroups(root)` and add their cards to the identity set. Only fall back to counting the root as one item when it contains a legacy video-path anchor but no group. Never scan outside supplied hidden roots.

- [ ] **Step 5: Run focused and performance tests and verify GREEN**

Run: `npx vitest run tests/unit/media-structure.test.ts tests/unit/recommendation-counter.test.ts tests/performance/initial-scan.test.ts`

Expected: PASS; non-semantic repeated cards are recognized, navigation is ignored, and the existing scan budget remains green.

- [ ] **Step 6: Commit structural media recognition**

```bash
git add src/content/media-structure.ts src/content/recommendation-counter.ts tests/unit/media-structure.test.ts tests/unit/recommendation-counter.test.ts
git commit -m "feat: recognize repeated recommendation cards"
```

---

### Task 4: Run structural protection on every known adapter and fix NoodleMagazine

**Files:**

- Modify: `src/content/generic-detector.ts`
- Modify: `src/content/blocker.ts`
- Modify: `src/content/bootstrap.ts`
- Modify: `tests/unit/generic-detector.test.ts`
- Modify: `tests/unit/blocker.test.ts`
- Modify: `tests/unit/bootstrap.test.ts`
- Modify: `tests/fixtures/noodlemagazine/home.html`
- Modify: `tests/fixtures/noodlemagazine/listing.html`
- Modify: `tests/fixtures/noodlemagazine/search.html`
- Modify: `tests/fixtures/noodlemagazine/watch.html`
- Modify: `tests/adapters/catalog-adapters.test.ts`

**Interfaces:**

- Produces: `scanRecommendations(root, context): StructuralScanResult`.
- Produces type: `StructuralScanResult = { matches: readonly RuleMatch[]; observedMediaGroups: number }`.
- Preserves `detectGeneric` as a wrapper returning `scanRecommendations(...).matches` for existing callers.
- Consumes `findMediaCardGroups` from Task 3.

- [ ] **Step 1: Write failing tests for known-adapter structural fallback and narrow selection**

```ts
it("runs structural blocking on a healthy known NoodleMagazine home page", () => {
  document.body.innerHTML = `<header><form role="search"><input type="search"></form></header>
    <main><section data-layout="rail">
      <div class="entry"><a href="/a1"><img alt=""></a></div>
      <div class="entry"><a href="/a2"><img alt=""></a></div>
      <div class="entry"><a href="/a3"><img alt=""></a></div>
    </section></main>`;
  const kernel = createContentKernel({
    page: document,
    url: new URL("https://noodlemagazine.com/"),
    registry: adapterRegistry,
    observe: false,
    inFrame: false
  });
  kernel.start();
  expect(document.querySelector("[data-layout='rail']")).toHaveAttribute("data-afb-hidden");
  expect(document.querySelector("form[role='search']")?.closest("[data-afb-hidden]")).toBeNull();
});

it("preserves structurally identical cards inside protected search results", () => {
  document.body.innerHTML = `<header><form role="search"><input type="search"></form></header>
    <main id="search-results"><section data-layout="rail">
      <div class="entry"><a href="/a1"><img alt=""></a></div>
      <div class="entry"><a href="/a2"><img alt=""></a></div>
      <div class="entry"><a href="/a3"><img alt=""></a></div>
    </section></main>`;
  const kernel = createContentKernel({
    page: document,
    url: new URL("https://noodlemagazine.com/search?q=fixture"),
    registry: adapterRegistry,
    observe: false,
    inFrame: false
  });
  kernel.start();
  expect(document.querySelector("#search-results")?.closest("[data-afb-hidden]")).toBeNull();
});

it("prefers the smallest qualifying recommendation group", () => {
  const result = scanRecommendations(document, {
    pageKind: "home",
    protection: new ProtectionRegistry()
  });
  expect(result.matches.map((match) => match.candidate.id)).toEqual(["rail"]);
});
```

- [ ] **Step 2: Run detector, blocker, bootstrap, and Noodle contract tests and verify RED**

Run: `npx vitest run tests/unit/generic-detector.test.ts tests/unit/blocker.test.ts tests/unit/bootstrap.test.ts tests/adapters/catalog-adapters.test.ts -t 'noodlemagazine|structural|smallest'`

Expected: FAIL because healthy known adapters skip generic detection and the existing Noodle fixtures only prove generic placeholder selectors.

- [ ] **Step 3: Extend recommendation scoring with structural groups**

`scanRecommendations` combines existing label/proximity signals with `findMediaCardGroups`. Apply page-class policy explicitly:

```ts
const STRUCTURAL_WEIGHTS = Object.freeze({
  recommendationLabel: 4,
  repeatedMediaCards: 3,
  homeOrBlockedListing: 3,
  nearPrimaryPlayer: 3,
  complementary: 2
});
```

Three repeated thumbnail cards plus home/listing context reaches the threshold of six. On watch pages, repeated cards plus player proximity reaches six. Unknown pages still require a recommendation label or another independent signal. Search/library candidates intersecting protected roots are rejected before scoring.

Return `observedMediaGroups` even when no match reaches threshold. Change nested pruning to retain the smallest complete qualifying group; never select `html`, `body`, `main`, `[role='main']`, or an ancestor containing one of those page shells.

- [ ] **Step 4: Apply exact then structural rules without overwriting known classification**

Refactor `bootstrap.ts` into separate helpers:

```ts
const applyStructural = (
  root: Document | Element | ShadowRoot,
  context: GenericPageContext
): StructuralScanResult => {
  registerGenericProtectedRoots(options.page, context, protection);
  const scan = scanRecommendations(root, {
    pageKind: context.pageKind,
    protection,
    ...(context.primaryPlayer ? { primaryPlayer: context.primaryPlayer } : {})
  });
  blocker?.blockElements(
    scan.matches.map((match) => match.candidate),
    "structural-high-confidence"
  );
  return scan;
};
```

Known adapters construct this context from their already-decided `pageKind` plus the selected player; they do not call `classifyGenericPage` and do not replace `pageKind`. Initial load and inserted subtrees run exact rules first and structural rules second. Unknown custom hosts continue to use generic classification.

Update `Blocker` so an element is not newly owned when it contains, is contained by, or equals an already owned hidden root. This prevents exact and structural layers from double-hiding nested regions.

If a known `home`, `blocked-listing`, or `watch` page observes repeated media groups but ends with zero hidden cards, publish `needs-update`; otherwise preserve existing health-check state logic.

- [ ] **Step 5: Replace NoodleMagazine fixtures with selector-independent sanitized structures**

Use `data-layout="rail"`, `.entry`, slug-only hrefs, empty-alt placeholder images, and `data-afb-expect` markers. The home/listing/watch recommendation containers must not match `.video-grid`, `.results`, `.items`, `.content-list`, or any recommendation label selector. The search fixture uses the same card structure inside `#search-results` with `data-afb-expect="preserve"`.

Change the adapter contract harness to instantiate `createContentKernel` rather than manually applying only exact rules, so every fixture exercises the shipped ordered pipeline.

- [ ] **Step 6: Run the full detector and adapter suites and verify GREEN**

Run: `npx vitest run tests/unit/generic-detector.test.ts tests/unit/blocker.test.ts tests/unit/bootstrap.test.ts tests/adapters/catalog-adapters.test.ts`

Expected: PASS for all 50 adapters; Noodle recommendations hide structurally while its search results and selected player remain visible.

- [ ] **Step 7: Commit known-site structural protection**

```bash
git add src/content tests/fixtures/noodlemagazine tests/unit/generic-detector.test.ts tests/unit/blocker.test.ts tests/unit/bootstrap.test.ts tests/adapters/catalog-adapters.test.ts
git commit -m "feat: apply structural blocking across known sites"
```

---

### Task 5: Hide uploader modules and close creator/profile continuation paths

**Files:**

- Create: `src/content/creator-guard.ts`
- Create: `src/content/link-neutralizer.ts`
- Create: `tests/unit/creator-guard.test.ts`
- Create: `tests/unit/link-neutralizer.test.ts`
- Modify: `src/adapters/site-factory.ts`
- Modify: `src/adapters/families/profiles.ts`
- Modify: `src/content/generic-detector.ts`
- Modify: `src/content/bootstrap.ts`
- Modify: `tests/unit/classifier.test.ts`
- Modify: `tests/unit/bootstrap.test.ts`
- Modify: `tests/fixtures/noodlemagazine/watch.html`

**Interfaces:**

- Produces: `detectCreatorPaths(root, context): CreatorDetection`.
- Produces type: `CreatorDetection = { containers: readonly Element[]; links: readonly HTMLAnchorElement[] }`.
- Produces class: `LinkNeutralizer` with `neutralize(links)`, `restoreAll()`, and `totalNeutralized`.
- Consumes page kind, `ProtectionRegistry`, and optional primary player.

- [ ] **Step 1: Write failing creator detection and link restoration tests**

```ts
it("selects uploader identity and more-from modules without selecting the player", () => {
  document.body.innerHTML = `<main>
    <div class="video-player"><video controls></video></div>
    <div class="uploader-info"><a href="/profile/fixture"><img alt="">[creator]</a><button>Follow</button></div>
    <section aria-label="More from this account">
      <a href="/a1"><img alt=""></a><a href="/a2"><img alt=""></a><a href="/a3"><img alt=""></a>
    </section>
  </main>`;
  const protection = new ProtectionRegistry();
  const player = document.querySelector("video")!;
  protection.register(player.closest(".video-player"));
  const result = detectCreatorPaths(document, {
    pageKind: "watch",
    protection,
    primaryPlayer: player
  });
  expect(result.containers).toContain(document.querySelector(".uploader-info"));
  expect(result.containers).toContain(document.querySelector("section"));
  expect(result.containers.some((node) => node.contains(document.querySelector("video")))).toBe(
    false
  );
});

it("neutralizes a residual creator link and fully restores it", () => {
  const link = document.querySelector<HTMLAnchorElement>("a")!;
  const guard = new LinkNeutralizer(document, new ProtectionRegistry());
  guard.neutralize([link]);
  expect(link.tabIndex).toBe(-1);
  expect(link.getAttribute("aria-disabled")).toBe("true");
  expect(link.hasAttribute("data-afb-link-neutralized")).toBe(true);
  guard.restoreAll();
  expect(link.hasAttribute("data-afb-link-neutralized")).toBe(false);
  expect(link.hasAttribute("aria-disabled")).toBe(false);
});
```

Add a click test dispatching a cancelable `MouseEvent("click")` and asserting `defaultPrevented === true` while neutralized and false after restoration.

- [ ] **Step 2: Run creator tests and verify RED**

Run: `npx vitest run tests/unit/creator-guard.test.ts tests/unit/link-neutralizer.test.ts tests/unit/classifier.test.ts tests/unit/bootstrap.test.ts`

Expected: FAIL because creator modules and reversible link neutralization do not exist and creator routes are not fully classified.

- [ ] **Step 3: Implement creator detection under strict boundaries**

Use interface-only selectors and path tokens:

```ts
const CREATOR_CONTAINER = [
  "[class*='uploader' i]",
  "[id*='uploader' i]",
  "[class*='creator-info' i]",
  "[class*='channel-info' i]",
  "[data-testid*='uploader' i]",
  "[data-role*='uploader' i]"
].join(",");

const CREATOR_PATH =
  /\/(?:users?|profiles?|creators?|uploaders?|channels?|models?|performers?|pornstars?|studios?)(?:\/|$)/i;
const WATCH_METADATA =
  "[class*='video-info' i], [class*='metadata' i], [class*='details' i], [data-video-details]";
```

Run only on `watch` for uploader surfaces/links and on `blocked-listing` for labeled creator continuation regions. Reject `nav`, `header`, `footer`, forms, any protected intersection, and any container holding the primary player. Residual links qualify only when inside `WATCH_METADATA` or an identified creator container; do not scan arbitrary global navigation.

Add “more from,” “uploader,” “creator,” and “channel” interface labels to recommendation scoring only when `pageKind === "watch"`.

- [ ] **Step 4: Implement reversible link neutralization**

`LinkNeutralizer` stores each link's original `tabindex` and `aria-disabled` presence/value in a `Map<HTMLAnchorElement, OriginalLinkState>`, adds `data-afb-link-neutralized`, sets `tabindex="-1"` and `aria-disabled="true"`, and installs one document-level capture listener. The listener calls `preventDefault()` and `stopImmediatePropagation()` only when the event target is within an owned neutralized anchor. `restoreAll()` restores or removes each original attribute exactly, clears ownership, and removes the listener.

Add extension CSS through the existing style element:

```css
[data-afb-link-neutralized] {
  pointer-events: none !important;
  cursor: default !important;
}
```

- [ ] **Step 5: Integrate creator guards and route classification**

After exact and structural blocking, `bootstrap.ts` calls `detectCreatorPaths`; it hides returned containers with rule ID `creator-path` and neutralizes only returned links not already inside a hidden container. `initialize()`, route changes, and `stop()` call `restoreAll()` on the neutralizer.

Extend known route classification with creator profile patterns that require a route segment, while leaving `/account`, `/settings`, login, billing, and user libraries preserved:

```ts
const CREATOR_LISTING =
  /\/(?:users?|profiles?|creators?|uploaders?|channels?|models?|performers?|pornstars?|studios?)(?:\/[^/?#]+)?(?:\/|$)/i;
```

Creator routes return `blocked-listing`; their discovery grid is removed by exact/structural layers while global search remains available. Do not add an interstitial.

- [ ] **Step 6: Run creator, classifier, bootstrap, and adapter tests and verify GREEN**

Run: `npx vitest run tests/unit/creator-guard.test.ts tests/unit/link-neutralizer.test.ts tests/unit/classifier.test.ts tests/unit/bootstrap.test.ts tests/adapters/catalog-adapters.test.ts`

Expected: PASS; uploader and more-from paths disappear, residual profile links cannot be clicked or focused, route restoration works, and the player/search remain protected.

- [ ] **Step 7: Commit creator-path protection**

```bash
git add src/content/creator-guard.ts src/content/link-neutralizer.ts src/content/bootstrap.ts src/content/generic-detector.ts src/adapters/site-factory.ts src/adapters/families/profiles.ts tests
git commit -m "feat: block uploader and creator continuation paths"
```

---

### Task 6: Enforce precision, mutation, browser, and 50-adapter regressions

**Files:**

- Modify: `tests/performance/generic-precision.test.ts`
- Modify: `tests/performance/initial-scan.test.ts`
- Modify: `tests/performance/mutation-budget.test.ts`
- Modify: `tests/extension/known-site.spec.ts`
- Modify: `tests/adapters/catalog-adapters.test.ts`
- Modify: `tests/fixtures/noodlemagazine/*.html`

**Interfaces:**

- Consumes the complete domain, structural, creator, mutation, counting, and registration pipeline from Tasks 1–5.
- Produces no production API; this task hardens release gates.

- [ ] **Step 1: Add failing precision and mutation regressions**

Extend the labeled precision corpus with:

```ts
const threePlaceholderCards = `
  <div class="entry"><a href="/a1"><img alt=""></a></div>
  <div class="entry"><a href="/a2"><img alt=""></a></div>
  <div class="entry"><a href="/a3"><img alt=""></a></div>`;

{
  name: "thumbnail navigation",
  pageKind: "home",
  html: `<nav><a href="/one"><img alt=""></a><a href="/two"><img alt=""></a><a href="/three"><img alt=""></a></nav>`,
  expectedHidden: []
},
{
  name: "search results using opaque slugs",
  pageKind: "search",
  html: `<main id="search-results"><section data-layout="rail">${threePlaceholderCards}</section></main>`,
  protectedSelector: "#search-results",
  expectedHidden: []
},
{
  name: "unlabeled watch rail",
  pageKind: "watch",
  html: `<div class="video-player"><video></video></div><section id="rail" data-layout="rail">${threePlaceholderCards}</section>`,
  expectedHidden: ["#rail"]
}
```

Add a mutation test that inserts a three-card rail and uploader module after kernel start, waits one batch, and expects both to be hidden with a badge count of exactly three.

- [ ] **Step 2: Run performance tests and verify RED where coverage is absent**

Run: `npm run test:performance`

Expected: at least one new structural or mutation assertion FAIL before the final integration adjustments.

- [ ] **Step 3: Make only bounded integration adjustments required by the regressions**

Keep the documented limits: at most 500 candidate containers per pass, at most 80 anchors per candidate, subtree-only mutation work, and no full-document rescan for an inserted subtree. Tune only interface-structure weights or pruning rules; do not inspect titles/usernames or weaken protected-root rejection.

- [ ] **Step 4: Extend the Chromium extension flow**

Serve a local fixture under a hostname covered by a built-in wildcard registration and assert:

```ts
await expect(page.locator("#selected-player")).toBeVisible();
await expect(page.locator("#opaque-recommendation-rail")).toHaveAttribute(
  "data-afb-hidden",
  /structural-high-confidence/
);
await expect(page.locator("#uploader-info")).toHaveAttribute("data-afb-hidden", /creator-path/);
await expect(page.locator("#search-results")).not.toHaveAttribute("data-afb-hidden", /.*/);
```

Also inspect registered built-in scripts and assert their `matches` include `https://*.xhamster.desi/*` and exclude `<all_urls>`/`https://*/*`.

- [ ] **Step 5: Run complete non-release suites and verify GREEN**

Run: `npm run test`

Expected: PASS for typecheck, lint, unit tests, and all 50 adapter contracts.

Run: `npm run test:performance`

Expected: PASS within existing 50 ms long-task and bounded-mutation gates.

Run: `npm run build && npm run test:extension`

Expected: PASS for the production unpacked extension and all Chromium flows.

- [ ] **Step 6: Commit regression coverage**

```bash
git add tests
git commit -m "test: enforce resilient recommendation blocking"
```

---

### Task 7: Publish and verify Zen Master 0.1.4

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/manifest.base.json`
- Modify: `README.md`
- Generated and ignored: `dist/**`
- Generated and ignored: `artifacts/zen-master-v0.1.4.zip`

**Interfaces:**

- Consumes the complete implementation and test gates from Tasks 1–6.
- Produces the reloadable `dist/` directory and `artifacts/zen-master-v0.1.4.zip`.

- [ ] **Step 1: Write the failing release metadata expectations**

Update `tests/unit/build.test.ts` and README policy expectations so they require:

```ts
expect(manifest.version).toBe("0.1.4");
expect(readme).toContain("verified domain roots and their subdomains");
expect(readme).toContain("uploader and creator continuation paths");
```

- [ ] **Step 2: Run release metadata tests and verify RED**

Run: `npx vitest run tests/unit/build.test.ts tests/unit/docs-policy.test.ts`

Expected: FAIL while package/manifest/README still describe 0.1.3 exact-host behavior.

- [ ] **Step 3: Bump version and update concise user documentation**

Set `version` to `0.1.4` in `package.json` and `src/manifest.base.json`, then run `npm install --package-lock-only` to update the lockfile. Update README coverage text to state:

```text
Zen Master protects each verified built-in domain root and its subdomains. It combines site-specific rules with conservative structural detection, preserves genuine search results and the selected player, and hides uploader and creator continuation paths on watch pages.
```

Document that alternate registrable domains remain explicit and user-added sites remain exact-origin grants.

- [ ] **Step 4: Run the complete verification gate**

Run: `npm run verify`

Expected: PASS for formatting, typecheck, lint, fixture validation, coverage, precision/performance, production build, package policy, and Chromium extension tests.

- [ ] **Step 5: Build the release archive and inspect it**

Run: `npm run package`

Expected: creates `artifacts/zen-master-v0.1.4.zip` from the verified `dist/` contents.

Run: `shasum -a 256 artifacts/zen-master-v0.1.4.zip`

Expected: prints one SHA-256 digest for the release archive; record it in the final handoff.

Run: `git status --short --ignored`

Expected: source changes are explicit, while `dist/` and `artifacts/` appear only as ignored outputs.

- [ ] **Step 6: Commit release metadata and verified build outputs**

```bash
git add package.json package-lock.json src/manifest.base.json README.md tests/unit/build.test.ts tests/unit/docs-policy.test.ts
git commit -m "release: build Zen Master 0.1.4"
```

- [ ] **Step 7: Reload the unpacked extension for the user**

Open `chrome://extensions/` in Google Chrome. The user clicks **Reload** on Zen Master and verifies that the card shows version 0.1.4. Then reload `https://noodlemagazine.com/` and `https://ge.xhamster.desi/`; no automated step bypasses access challenges or interacts with media.
