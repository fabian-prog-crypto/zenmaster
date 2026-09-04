# Adult Tube Recommendation Blocker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Manifest V3 Chrome extension that removes passive discovery and recommendation surfaces from 50 adult tube platforms, preserves search and intentional viewing, and supports private exact-origin generic blocking for user-added sites.

**Architecture:** A generated manifest grants persistent access only to the fixed launch catalog and declares ungranted optional HTTP(S) host capability for custom sites. An isolated-world content kernel resolves immutable site adapters, protects search/player roots, applies reversible attribute-based hiding, observes dynamic content, and reports ephemeral status; a minimal main-world bridge reports SPA route changes and hosts narrowly scoped packaged auto-advance hooks. A service worker owns permission and content-script registration lifecycle, while native TypeScript popup and Settings pages expose only status, add-site, and custom-site removal flows.

**Tech Stack:** Node.js 22.22+, npm 10.9+, TypeScript 6.0.3, Chrome Manifest V3, esbuild 0.28.2, Vite 8.2.2/Vitest 5.0.0, happy-dom 20.14.0, Playwright 1.62.1, fflate 0.8.3, ESLint 10.10.0, Prettier 3.9.6; no runtime dependencies and no UI framework.

**Spec:** `docs/superpowers/specs/2026-09-04-adult-tube-recommendation-blocker-design.md`

## Global Constraints

- Target desktop Google Chrome with Manifest V3; do not add Firefox, Safari, mobile, or Manifest V2 compatibility.
- Use extension version `0.1.0` until a separate release-version decision changes it.
- Keep runtime dependencies at zero. Development-only packages must remain pinned in `package-lock.json`.
- Use native HTML, CSS, and TypeScript for popup and Settings.
- Persist only `{ schemaVersion, customSites[] }` in `chrome.storage.local`; never use `chrome.storage.sync`.
- Never persist or transmit page URLs, paths, query strings, titles, search terms, media IDs, viewing events, or per-tab blocked counts.
- Make zero extension-owned production network requests and package all executable code and rules.
- Do not request `tabs`, `history`, `cookies`, `webRequest`, `declarativeNetRequest`, identity, clipboard, downloads, or notification permissions.
- Persistent host permissions cover only the 50 catalog entries, their `www` hosts, and four specified `.tube` aliases.
- Declare `http://*/*` and `https://*/*` only under `optional_host_permissions`; runtime requests must contain one exact current scheme and hostname.
- Call `chrome.permissions.request` from the service worker in the same synchronous `onMessage` turn as the popup click, with no awaited work before it; otherwise Chrome may discard the user gesture.
- Provide no extension-owned pause, reveal, per-site disable, or built-in-site removal action.
- Search, direct video playback, history, favorites, saved videos, subscriptions, and user-created playlists remain usable.
- Home, category, tag, performer, model, studio, channel, trending, popular, recent, best, related, suggested, up-next, and end-screen video surfaces are hidden.
- Do not bypass authentication, age assurance, paywalls, geographic restrictions, or browser security controls.
- Do not commit explicit images, video, titles, usernames, search terms, or unsanitized live-page captures.
- Known adapters must fail safely; generic detection must optimize precision over recall and may never hide protected search/player roots.
- Every implementation task follows red-green-refactor and ends in a focused commit.

---

## File Map

### Build and package

- `package.json` — pinned development toolchain and canonical scripts.
- `package-lock.json` — reproducible dependency graph.
- `tsconfig.json` — strict TypeScript configuration shared by production and tests.
- `eslint.config.mjs` — TypeScript lint rules and browser/global boundaries.
- `.prettierrc.json` — deterministic formatting.
- `.gitignore` — generated build, Playwright output, and capture scratch exclusions.
- `vitest.config.ts` — happy-dom unit/adapter test projects and coverage thresholds.
- `playwright.config.ts` — unpacked-extension Chromium test configuration.
- `scripts/build.mjs` — esbuild entry bundling, static-asset copy, and manifest generation.
- `scripts/package.mjs` — deterministic ZIP creation after verification.
- `scripts/check-package.mjs` — permissions, content, and outbound-network policy inspection.
- `src/manifest.base.json` — non-generated Manifest V3 fields.
- `dist/` — ignored unpacked extension output.

### Catalog, adapters, and page behavior

- `src/adapters/catalog.json` — the exact 50-platform catalog, aliases, and family membership.
- `src/adapters/ruleset-version.ts` — the packaged ruleset version displayed in Settings and release evidence.
- `src/adapters/types.ts` — adapter, rule, health-check, and auto-advance contracts.
- `src/adapters/define-adapter.ts` — runtime validation and immutable adapter construction.
- `src/adapters/registry.ts` — hostname lookup and adapter registration.
- `src/adapters/families/*.ts` — shared family route/rule profiles.
- `src/adapters/sites/*.ts` — one focused adapter per platform.
- `src/content/classifier.ts` — page-class precedence and adapter invocation.
- `src/content/protection-registry.ts` — protected search/player/library DOM roots.
- `src/content/blocker.ts` — rule evaluation, reversible marks, hide stylesheet, and counts.
- `src/content/generic-detector.ts` — fixed scoring and localized interface lexicon.
- `src/content/mutation-controller.ts` — batched inserted-subtree processing.
- `src/content/route-controller.ts` — isolated-world route-change lifecycle.
- `src/content/route-bridge.ts` — minimal main-world history bridge.
- `src/content/auto-advance.ts` — confirmed-control and packaged-hook auto-advance prevention.
- `src/content/bootstrap.ts` — content-kernel composition and message endpoint.

### Background and UI

- `src/background/chrome-api.ts` — narrow injectable Chrome API facade.
- `src/background/registration-ids.ts` — deterministic safe content-script IDs.
- `src/background/registrations.ts` — built-in/custom content-script reconciliation.
- `src/background/permissions.ts` — exact-origin add/remove operations.
- `src/background/service-worker.ts` — event wiring and versioned request handling.
- `src/shared/page-kind.ts` — canonical page-class union.
- `src/shared/status.ts` — ephemeral status types and derivation.
- `src/shared/messages.ts` — validated versioned message union.
- `src/shared/storage.ts` — local schema validation and migration.
- `src/popup/index.html`, `popup.ts`, `popup.css` — popup state rendering and add-site action.
- `src/settings/index.html`, `settings.ts`, `settings.css` — built-in catalog and custom-site removal.

### Fixtures and tests

- `scripts/capture-fixture.mjs` — media-blocked, in-memory capture that writes sanitized output only.
- `scripts/sanitize-fixture.mjs` — deterministic structural sanitization.
- `scripts/validate-fixtures.mjs` — rejects explicit or structurally incomplete fixtures.
- `tests/helpers/adapter-contract.ts` — shared behavioral contract for every adapter.
- `tests/helpers/chrome-fake.ts` — stateful Chrome API test double.
- `tests/helpers/extension-context.ts` — Playwright persistent-context loader.
- `tests/fixtures/<adapter-id>/*.html` — sanitized structural snapshots.
- `tests/fixtures/<adapter-id>/*.meta.json` — synthetic URL, page class, and expectation metadata.
- `tests/fixtures/generic/*.html` — labeled mixed-page precision corpus.
- `tests/unit/*.test.ts` — pure module tests.
- `tests/adapters/*.test.ts` — adapter-family and per-site contract tests.
- `tests/extension/*.spec.ts` — unpacked-extension end-to-end flows.
- `tests/performance/*.test.ts` — initial scan and mutation budgets.
- `docs/release/manual-smoke.md` — one legally constrained release row per platform.
- `README.md`, `PRIVACY.md`, and `CHANGELOG.md` — user behavior, permissions, privacy, local development, and non-sensitive release history.

---

### Task 1: Bootstrap the strict TypeScript test toolchain and launch catalog

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.gitignore`
- Create: `vitest.config.ts`
- Create: `src/adapters/catalog.json`
- Create: `src/adapters/ruleset-version.ts`
- Test: `tests/unit/catalog.test.ts`

**Interfaces:**
- Consumes: Section 6 of the approved spec.
- Produces: `RULESET_VERSION`, the canonical 50-entry JSON catalog, and working `typecheck`, `lint`, `format:check`, and `test:unit` commands.

- [ ] **Step 1: Add the pinned development toolchain**

Create `package.json` with `private: true`, `type: "module"`, `engines.node: ">=22.22.0"`, and these scripts:

```json
{
  "scripts": {
    "build": "node scripts/build.mjs",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "test:unit": "vitest run tests/unit",
    "test:adapters": "vitest run tests/adapters",
    "test:performance": "vitest run tests/performance",
    "test:extension": "playwright test",
    "test:coverage": "vitest run --coverage tests/unit tests/adapters",
    "test": "npm run typecheck && npm run lint && npm run test:unit && npm run test:adapters",
    "package": "node scripts/package.mjs",
    "check:package": "node scripts/check-package.mjs"
  }
}
```

Run:

```bash
npm install --save-dev typescript@6.0.3 esbuild@0.28.2 vite@8.2.2 vitest@5.0.0 @vitest/coverage-v8@5.0.0 @playwright/test@1.62.1 happy-dom@20.14.0 fflate@0.8.3 @types/chrome@0.2.8 @types/node@22.20.1 eslint@10.10.0 typescript-eslint@8.69.0 prettier@3.9.6
```

Expected: `package-lock.json` records exact resolved versions and `npm ls --depth=0` exits 0.

- [ ] **Step 2: Configure strict compilation and linting**

Use `module`/`moduleResolution: "NodeNext"`, `target: "ES2022"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `resolveJsonModule: true`, `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, and `noEmit: true`. Configure Vitest for `happy-dom`, globals disabled, restored mocks, and test discovery under `tests/**/*.test.ts`.

- [ ] **Step 3: Write the failing catalog test**

```ts
import { describe, expect, it } from "vitest";
import catalog from "../../src/adapters/catalog.json" with { type: "json" };
import { RULESET_VERSION } from "../../src/adapters/ruleset-version.js";

const expectedIds = [
  "pornhub", "xvideos", "xnxx", "xhamster", "youporn", "redtube", "tube8",
  "spankbang", "txxx", "eporner", "noodlemagazine", "mat6tube", "tukif",
  "hclips", "hqporner", "porntrex", "upornia", "beeg", "thumbzilla",
  "pornone", "xgroovy", "heavyfetish", "pornditt", "pornzog", "hdzog",
  "thegay", "ooxxx", "hotmovs", "vjav", "pornl", "voyeurhit", "manysex",
  "tubepornclassic", "shemalez", "fourkporn", "crazyporn", "love4porn",
  "hoes", "motherless", "theyarehuge", "trannyone", "ahme", "ashemale",
  "bdsmone", "bemyhole", "gaygo", "gayxo", "shemalepub", "sunporno",
  "yesvids"
] as const;

describe("launch catalog", () => {
  it("contains the approved 50 unique adapters", () => {
    expect(catalog.map((entry) => entry.id)).toEqual(expectedIds);
    const exactHosts = catalog.flatMap((entry) => [entry.primaryHostname, ...entry.aliases]);
    expect(new Set(exactHosts).size).toBe(exactHosts.length);
  });

  it("starts with packaged ruleset version one", () => {
    expect(RULESET_VERSION).toBe(1);
  });
});
```

- [ ] **Step 4: Run the test and confirm the red state**

Run: `npm run test:unit -- tests/unit/catalog.test.ts`

Expected: FAIL because `src/adapters/catalog.json` does not exist.

- [ ] **Step 5: Create the canonical catalog**

Create `src/adapters/catalog.json` with the exact order, IDs, display names, primary hostnames, four `.tube` aliases, and family assignments from the spec. Each record has this closed shape:

```ts
interface CatalogEntry {
  id: string;
  displayName: string;
  primaryHostname: string;
  aliases: string[];
  family: "aylo" | "wgcz" | "avs" | "8579" | "trendio" | "standalone";
}
```

Generate `www` matching later from `primaryHostname` only; never create `www` variants for aliases. Use these alias arrays exactly: Txxx has `txxx.tube`, HDZog has `hdzog.tube`, TheGay has `thegay.tube`, and ShemaleZ has `shemalez.tube`; every other `aliases` array is empty.

Create `src/adapters/ruleset-version.ts` with `export const RULESET_VERSION = 1 as const;`. Incrementing it is a separately reviewed release change; individual adapter `ruleVersion` values remain independent.

- [ ] **Step 6: Verify catalog and repository hygiene**

Run: `npm run test:unit -- tests/unit/catalog.test.ts && npm run typecheck && npm run lint && npm run format:check`

Expected: all commands PASS; catalog test reports two passing tests and 50 IDs.

- [ ] **Step 7: Commit the toolchain and catalog**

```bash
git add package.json package-lock.json tsconfig.json eslint.config.mjs .prettierrc.json .gitignore vitest.config.ts src/adapters/catalog.json src/adapters/ruleset-version.ts tests/unit/catalog.test.ts
git commit -m "chore: bootstrap extension toolchain and catalog"
```

### Task 2: Generate a deterministic Manifest V3 extension build

**Files:**
- Create: `src/manifest.base.json`
- Create: `scripts/build.mjs`
- Create: `src/background/service-worker.ts`
- Create: `src/content/bootstrap.ts`
- Create: `src/content/route-bridge.ts`
- Create: `src/popup/index.html`
- Create: `src/popup/popup.ts`
- Create: `src/popup/popup.css`
- Create: `src/settings/index.html`
- Create: `src/settings/settings.ts`
- Create: `src/settings/settings.css`
- Test: `tests/unit/build.test.ts`

**Interfaces:**
- Consumes: `src/adapters/catalog.json`.
- Produces: `dist/manifest.json` and fixed bundle paths used by content-script registration.

- [ ] **Step 1: Write the failing manifest-generation test**

The test runs `node scripts/build.mjs`, parses `dist/manifest.json`, and asserts:

```ts
expect(manifest.manifest_version).toBe(3);
expect(manifest.permissions.sort()).toEqual(["activeTab", "scripting", "storage"]);
expect(manifest.optional_host_permissions).toEqual(["http://*/*", "https://*/*"]);
expect(manifest.host_permissions).not.toContain("<all_urls>");
expect(manifest.host_permissions).toContain("https://pornhub.com/*");
expect(manifest.host_permissions).toContain("https://www.pornhub.com/*");
expect(manifest.host_permissions).toContain("https://txxx.tube/*");
expect(manifest.background).toEqual({ service_worker: "background/service-worker.js", type: "module" });
```

- [ ] **Step 2: Confirm the build is red**

Run: `npm run test:unit -- tests/unit/build.test.ts`

Expected: FAIL because the build script and manifest base do not exist.

- [ ] **Step 3: Implement the minimal build**

`scripts/build.mjs` must remove and recreate `dist`, bundle five fixed entry points with esbuild, copy popup/Settings HTML and CSS, derive sorted `https` patterns for each primary hostname, each primary hostname's `www` form, and the four aliases, and write stable two-space JSON. Assert the resulting persistent list contains exactly 104 patterns and no `www` alias variants. Use fixed names:

```js
const entryPoints = {
  "background/service-worker": "src/background/service-worker.ts",
  "content/bootstrap": "src/content/bootstrap.ts",
  "content/route-bridge": "src/content/route-bridge.ts",
  "popup/popup": "src/popup/popup.ts",
  "settings/settings": "src/settings/settings.ts"
};
```

The base manifest contains the action popup, options page, service worker, CSP `script-src 'self'; object-src 'self'`, and no static content scripts. Task 12 supplies the two built-in dynamic registrations and the per-custom-origin registrations against these fixed bundle paths.

- [ ] **Step 4: Make the entry points valid but inert**

Use side-effect-free exports in TypeScript stubs. Popup and Settings HTML each load their module script and linked stylesheet; neither page includes inline script or inline event handlers.

- [ ] **Step 5: Verify deterministic output**

Run `npm run build` twice and compare `shasum -a 256 dist/manifest.json dist/background/service-worker.js dist/content/bootstrap.js dist/content/route-bridge.js` output across runs.

Expected: hashes are identical across the two builds.

- [ ] **Step 6: Run checks and commit**

Run: `npm run test:unit -- tests/unit/build.test.ts && npm run typecheck && npm run lint`

Expected: PASS.

```bash
git add src scripts/build.mjs tests/unit/build.test.ts
git commit -m "build: generate deterministic manifest v3 extension"
```

### Task 3: Define page, status, message, storage, and custom-origin contracts

**Files:**
- Create: `src/shared/page-kind.ts`
- Create: `src/shared/status.ts`
- Create: `src/shared/messages.ts`
- Create: `src/shared/storage.ts`
- Test: `tests/unit/storage.test.ts`
- Test: `tests/unit/messages.test.ts`

**Interfaces:**
- Produces: `PageKind`, `PageStatus`, `StoredStateV1`, `parseStoredState`, `normalizeCustomSite`, `parseMessage`.

- [ ] **Step 1: Write red tests for schema defaults and origin normalization**

Cover missing state, corrupt state, duplicate custom entries, uppercase hostnames, embedded credentials, non-HTTP protocols, URL fragments, and path/query removal. Assert:

```ts
expect(normalizeCustomSite("HTTPS://WWW.Example.COM/watch?q=secret#x")).toEqual({
  scheme: "https",
  hostname: "www.example.com",
  originPattern: "https://www.example.com/*"
});
expect(() => normalizeCustomSite("chrome://extensions")).toThrow("Unsupported URL scheme");
expect(() => normalizeCustomSite("https://user:pass@example.com/")).toThrow("Credentials are not allowed");
```

- [ ] **Step 2: Confirm failures**

Run: `npm run test:unit -- tests/unit/storage.test.ts tests/unit/messages.test.ts`

Expected: FAIL on missing modules.

- [ ] **Step 3: Implement exact shared types**

Use the spec's seven-value `PageKind`, six-value `PageStatus.state`, and `StoredStateV1`. `parseStoredState` returns `{ schemaVersion: 1, customSites: [] }` for absent/corrupt input and deduplicates by `scheme + hostname` while preserving earliest `addedAt`.

Messages are a discriminated union with literal `version: 1` and these request types:

```ts
type Request =
  | { version: 1; type: "GET_PAGE_STATUS" }
  | { version: 1; type: "ADD_CURRENT_SITE"; tabId: number; origin: string }
  | { version: 1; type: "LIST_SETTINGS" }
  | { version: 1; type: "REMOVE_CUSTOM_SITE"; scheme: "http" | "https"; hostname: string };
```

Reject extra executable fields and unknown versions/types with a structured `{ ok: false, error: "invalid-message" }` response.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit -- tests/unit/storage.test.ts tests/unit/messages.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add src/shared tests/unit/storage.test.ts tests/unit/messages.test.ts
git commit -m "feat: define extension state and message contracts"
```

### Task 4: Implement the immutable adapter contract and hostname registry

**Files:**
- Create: `src/adapters/types.ts`
- Create: `src/adapters/define-adapter.ts`
- Create: `src/adapters/registry.ts`
- Test: `tests/unit/adapter-registry.test.ts`

**Interfaces:**
- Consumes: `PageKind`, catalog IDs/hostnames.
- Produces: `CatalogEntry`, `defineAdapter(input): SiteAdapter`, `createAdapterRegistry(adapters): AdapterRegistry`.

- [ ] **Step 1: Write failing validation and lookup tests**

Test duplicate IDs, duplicate hostnames, uppercase normalization, invalid selectors, mutable input arrays, unknown hosts, and `www` lookup. A registry created with adapter `pornhub` must resolve both `pornhub.com` and `www.pornhub.com` to the same frozen object.

- [ ] **Step 2: Confirm red**

Run: `npm run test:unit -- tests/unit/adapter-registry.test.ts`

Expected: FAIL on missing adapter modules.

- [ ] **Step 3: Implement the contract**

Define `CatalogEntry`, `ClassificationContext`, `Rule`, `ContainerResolution`, `HealthCheck`, `AutoAdvanceRule`, and `SiteAdapter` exactly as the catalog/spec require. Add `frameSupport: "top-only" | "matching-frames"`, defaulting to `top-only`. The registry boundary is:

```ts
interface AdapterRegistry {
  readonly size: number;
  ids(): readonly string[];
  getAdapterForHostname(hostname: string): SiteAdapter | undefined;
}
```

`defineAdapter` validates adapter ID, nonempty hosts, `ruleVersion >= 1`, unique rule IDs, syntactically valid selectors using `document.querySelector`, and then deep-freezes the result.

The registry accepts a fully constructed adapter list; it contains no site-specific branches and throws during startup if IDs or normalized hostnames collide.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit -- tests/unit/adapter-registry.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add src/adapters/types.ts src/adapters/define-adapter.ts src/adapters/registry.ts tests/unit/adapter-registry.test.ts
git commit -m "feat: add validated adapter registry"
```

### Task 5: Implement page classification with protected precedence

**Files:**
- Create: `src/content/classifier.ts`
- Test: `tests/unit/classifier.test.ts`

**Interfaces:**
- Consumes: `SiteAdapter.classify(context)` and `PageKind`.
- Produces: `classifyPage(adapter, url, document): ClassificationResult`.

- [ ] **Step 1: Write precedence tests**

Construct a fake adapter whose patterns overlap. Prove `restricted > search > library > watch > blocked-listing > home > unknown`, including a search URL containing `/category/` and a library URL containing `/popular/`.

- [ ] **Step 2: Confirm red**

Run: `npm run test:unit -- tests/unit/classifier.test.ts`

Expected: FAIL because `classifyPage` is missing.

- [ ] **Step 3: Implement classification**

`classifyPage` parses with `new URL`, supplies read-only path/query-key/DOM helpers to the adapter, and catches adapter errors. It never passes query values or page text into status/storage. Adapter exceptions return `{ pageKind: "unknown", degraded: true, reason: "classification-error" }`.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit -- tests/unit/classifier.test.ts`

Expected: PASS.

```bash
git add src/content/classifier.ts tests/unit/classifier.test.ts
git commit -m "feat: classify pages with safe precedence"
```

### Task 6: Build protected roots and reversible blocking

**Files:**
- Create: `src/content/protection-registry.ts`
- Create: `src/content/blocker.ts`
- Test: `tests/unit/blocker.test.ts`

**Interfaces:**
- Produces: `ProtectionRegistry`, `Blocker.applyRules`, `Blocker.restoreAll`, `BlockResult`.

- [ ] **Step 1: Write failing DOM tests**

Use happy-dom fixtures containing a player, search results, a sidebar, and nested containers. Test `self`, `closest(selector)`, and `parent(levels)` resolution. Assert a candidate is rejected when it is, contains, or sits inside a protected root, and that `restoreAll()` removes only `data-afb-hidden` attributes owned by the extension.

- [ ] **Step 2: Confirm red**

Run: `npm run test:unit -- tests/unit/blocker.test.ts`

Expected: FAIL on missing classes.

- [ ] **Step 3: Implement the protection registry**

Use a `Set<Element>` with `register`, `clear`, and `intersects(candidate)` methods. Purge disconnected elements during checks. Do not mutate protected nodes.

- [ ] **Step 4: Implement the blocker**

Install one stylesheet with:

```css
[data-afb-hidden] { display: none !important; }
```

Apply stable values `<adapter-id>:<rule-id>`, deduplicate matches, cap parent traversal at the rule's validated fixed maximum, catch selector failures per rule, and return `{ newlyBlocked, totalBlocked, errors }` without throwing into the host page.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:unit -- tests/unit/blocker.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add src/content/protection-registry.ts src/content/blocker.ts tests/unit/blocker.test.ts
git commit -m "feat: hide recommendation roots reversibly"
```

### Task 7: Add batched mutation processing and SPA route lifecycle

**Files:**
- Create: `src/content/mutation-controller.ts`
- Create: `src/content/route-controller.ts`
- Replace: `src/content/route-bridge.ts`
- Test: `tests/unit/mutation-controller.test.ts`
- Test: `tests/unit/route-controller.test.ts`

**Interfaces:**
- Consumes: `Blocker.applyRules`, `Blocker.restoreAll`, page reinitializer callback.
- Produces: `MutationController.start/stop`, `RouteController.start/stop`, event `afb:route-change`.

- [ ] **Step 1: Write red mutation tests**

Assert 100 synchronous inserted descendants become one deduplicated batch, an inserted ancestor subsumes its descendants, extension-owned attribute changes do not loop, newly discovered open shadow roots are observed once, closed roots are ignored, candidate-count limits defer remaining work, a simulated 40 ms processing deadline aborts and defers remaining generic candidates, and no mutation path calls a full-document scan.

- [ ] **Step 2: Write red route tests**

Assert `popstate`, `hashchange`, `pushState`, and `replaceState` schedule one restore/reclassify/reapply cycle; repeated events with an unchanged URL do nothing.

- [ ] **Step 3: Confirm red**

Run: `npm run test:unit -- tests/unit/mutation-controller.test.ts tests/unit/route-controller.test.ts`

Expected: FAIL on missing implementations.

- [ ] **Step 4: Implement mutation batching**

Observe only `childList/subtree`, queue added `Element` roots in a `Set`, collapse descendants, discover and separately observe open shadow roots, and schedule processing with `queueMicrotask` followed by `requestAnimationFrame`. Enforce a fixed per-pass candidate limit and a 40 ms monotonic processing deadline; stop before processing the next candidate once either limit is reached, then schedule overflow with `requestIdleCallback` plus a timer fallback. Expose injectable `now` and scheduler functions for deterministic tests.

- [ ] **Step 5: Implement the route bridge and controller**

The MAIN-world bridge wraps `history.pushState` and `history.replaceState`, calls the original with unchanged receiver/arguments, then dispatches `new Event("afb:route-change")`. It reads no state argument. The isolated controller listens to that event plus `popstate` and `hashchange`, compares `location.href` in memory, stops observation, restores marks, reinitializes, and restarts observation.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:unit -- tests/unit/mutation-controller.test.ts tests/unit/route-controller.test.ts`

Expected: PASS.

```bash
git add src/content/route-bridge.ts src/content/route-controller.ts src/content/mutation-controller.ts tests/unit/mutation-controller.test.ts tests/unit/route-controller.test.ts
git commit -m "feat: handle dynamic content and spa routes"
```

### Task 8: Implement the conservative generic detector

**Files:**
- Create: `src/content/generic-detector.ts`
- Test: `tests/unit/generic-detector.test.ts`

**Interfaces:**
- Consumes: `PageKind`, `ProtectionRegistry`.
- Produces: `classifyGenericPage(url, document): GenericPageContext`, `registerGenericProtectedRoots(document, context, registry)`, `scoreCandidate(candidate, context): CandidateScore`, `detectGeneric(root, context): RuleMatch[]`.

- [ ] **Step 1: Write failing scoring tests**

Encode every score from the spec: recommendation keyword `+4`, blocked-listing route/heading `+4`, three video-like links near player `+3`, four-card signature `+2`, complementary region near player `+2`, threshold `6`, and absolute rejection for protected/search/account/legal contexts.

Include English, German, French, Spanish, Italian, Dutch, and Portuguese UI-label cases. Include an unlabeled search grid that reaches only the card score and remains visible. Add generic page fixtures proving that search is recognized from route/query-key plus form/result-shell evidence, watch is recognized from a primary player plus route/heading evidence, user-library routes remain `library`, restricted/login/legal contexts remain `restricted`, and ambiguous pages remain `unknown`.

- [ ] **Step 2: Confirm red**

Run: `npm run test:unit -- tests/unit/generic-detector.test.ts`

Expected: FAIL because the detector is missing.

- [ ] **Step 3: Implement fixed scoring**

Export immutable constants:

```ts
export const GENERIC_THRESHOLD = 6;
export const GENERIC_WEIGHTS = Object.freeze({
  recommendationLabel: 4,
  blockedListing: 4,
  videoLinksNearPlayer: 3,
  repeatedCards: 2,
  complementaryNearPlayer: 2
});
```

Use these closed result shapes so the kernel never has to infer detector output:

```ts
interface GenericPageContext {
  pageKind: PageKind;
  primaryPlayer?: Element;
}

interface CandidateScore {
  candidate: Element;
  score: number;
  rejected: boolean;
  signals: readonly string[];
}

interface RuleMatch {
  ruleId: "generic-high-confidence";
  candidate: Element;
  score: number;
}
```

`classifyGenericPage` uses route tokens, query-key names, semantic form roles, player structure, and interface headings; it never reads query values or free-form card text. It must require two independent signals before returning `search` or `watch`, return `library` for confirmed history/favorites/saved/subscription/playlist shells, return `restricted` for browser/access/login/legal/checkout shells, and otherwise return `unknown`. `registerGenericProtectedRoots` marks confirmed search form/results, library list, or primary player/control roots before any scoring occurs.

Tokenize recommendation evidence only from interface headings, `aria-label`, IDs, and class names. Never inspect video titles, user names, or free-form card text. Limit candidate ancestry and per-pass candidates, and return matches without mutating the DOM.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit -- tests/unit/generic-detector.test.ts`

Expected: PASS.

```bash
git add src/content/generic-detector.ts tests/unit/generic-detector.test.ts
git commit -m "feat: detect high-confidence recommendation containers"
```

### Task 9: Implement safe auto-advance prevention

**Files:**
- Create: `src/content/auto-advance.ts`
- Test: `tests/unit/auto-advance.test.ts`

**Interfaces:**
- Consumes: `AutoAdvanceRule` from adapter types.
- Produces: `AutoAdvanceController.apply(rule, context): AutoAdvanceResult`, `dispose()`.

- [ ] **Step 1: Write failing behavior tests**

Cover an on/off control with `aria-checked`, a removable countdown container, an `ended` guard, a missing optional control, and a throwing main-world hook. Assert the current `<video>` remains playable and its initial `autoplay` property is not changed.

- [ ] **Step 2: Confirm red**

Run: `npm run test:unit -- tests/unit/auto-advance.test.ts`

Expected: FAIL on the missing controller.

- [ ] **Step 3: Implement only confirmed strategies**

Support a closed union of `toggle-off`, `hide-countdown`, `ended-guard`, and `packaged-main-hook`. A toggle may be clicked only when its declared state reader confirms it is on. The controller records disposers for listeners/observers and reports `{ supported, blocked, errors }`.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit -- tests/unit/auto-advance.test.ts`

Expected: PASS.

```bash
git add src/content/auto-advance.ts tests/unit/auto-advance.test.ts
git commit -m "feat: prevent confirmed video auto-advance"
```

### Task 10: Compose the content kernel and ephemeral status endpoint

**Files:**
- Replace: `src/content/bootstrap.ts`
- Test: `tests/unit/bootstrap.test.ts`

**Interfaces:**
- Consumes: registry, classifier, protection registry, blocker, generic detector, mutation/route controllers, auto-advance controller, messages/status.
- Produces: `createContentKernel(dependencies)`, live `GET_PAGE_STATUS` response.

- [ ] **Step 1: Write red integration tests**

Use a fake known adapter and a fake custom-site mode. Assert initialization order is classify → register protected roots → exact rules → fallback when degraded → auto-advance → observer. For custom mode, assert generic classification and generic protected-root registration happen before scoring. Assert `needs-update` for a failed stable health check, thrown selector/hook, missing required protected root, or unreachable adapter-declared auto-advance mechanism, while zero matches from an optional rule remains healthy. Assert the hide stylesheet and observer are installed during `document_start`, route changes clear previous marks and blocked count, top-only adapters exit inside frames, and matching-frame adapters run only when the frame shares the parent origin and resolves to the declared adapter hostname. Assert no status includes URL or page text.

- [ ] **Step 2: Confirm red**

Run: `npm run test:unit -- tests/unit/bootstrap.test.ts`

Expected: FAIL because the kernel is not composed.

- [ ] **Step 3: Implement dependency-injected composition**

`createContentKernel` returns `{ start, stop, getStatus }`. Known healthy adapters produce `active-known`; custom hosts call `classifyGenericPage`, register its protected roots, and produce `active-generic`; known health/check exceptions produce `needs-update` while retaining generic fallback counts. On `restricted`, do not mutate the page.

The production module starts once using a symbol on `globalThis` so immediate injection after a custom-site grant cannot duplicate an existing kernel.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit -- tests/unit/bootstrap.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add src/content/bootstrap.ts tests/unit/bootstrap.test.ts
git commit -m "feat: compose the page protection kernel"
```

### Task 11: Implement the Chrome API facade and deterministic registration IDs

**Files:**
- Create: `src/background/chrome-api.ts`
- Create: `src/background/registration-ids.ts`
- Create: `tests/helpers/chrome-fake.ts`
- Test: `tests/unit/registration-ids.test.ts`

**Interfaces:**
- Produces: `ChromeApi`, `createChromeApi()`, `createChromeFake()`, `registrationIdsForOrigin(pattern): Promise<RegistrationIds>`.

- [ ] **Step 1: Write failing facade/ID tests**

Assert the fake records active-tab queries, tab messages, runtime messages, permissions, registrations, storage, and injections. Assert `https://www.example.com/*` always maps to two distinct IDs matching Chrome's `[A-Za-z0-9_]+` requirement, never embeds the hostname, and changes when either scheme or hostname changes.

- [ ] **Step 2: Confirm red**

Run: `npm run test:unit -- tests/unit/registration-ids.test.ts`

Expected: FAIL on missing files.

- [ ] **Step 3: Implement the narrow facade**

Expose only the methods used by this extension: `tabs.query` for the active tab, `tabs.sendMessage`, storage `get/set`, permissions `request/remove/contains`, scripting `registerContentScripts`/`updateContentScripts`/`unregisterContentScripts`/`getRegisteredContentScripts`/`executeScript`, runtime `sendMessage`/`onMessage`, and runtime `onInstalled` plus `onStartup`. The real facade is a thin Promise-based wrapper; the fake records calls and can inject denial, missing-receiver, worker-restart, and execution failures. Hash the normalized origin pattern with the platform Web Crypto SHA-256 implementation, encode the first 20 bytes as lowercase hex, and return IDs `afb_custom_isolated_<hash>` and `afb_custom_main_<hash>`; no hostname or browsing path appears in registration IDs.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit -- tests/unit/registration-ids.test.ts`

Expected: PASS.

```bash
git add src/background/chrome-api.ts src/background/registration-ids.ts tests/helpers/chrome-fake.ts tests/unit/registration-ids.test.ts
git commit -m "feat: isolate chrome extension APIs"
```

### Task 12: Implement permission and content-script registration lifecycle

**Files:**
- Create: `src/background/permissions.ts`
- Create: `src/background/registrations.ts`
- Replace: `src/background/service-worker.ts`
- Test: `tests/unit/permissions.test.ts`
- Test: `tests/unit/registrations.test.ts`

**Interfaces:**
- Consumes: catalog, storage, message contracts, ChromeApi, registration IDs.
- Produces: `addCustomSite`, `removeCustomSite`, `reconcileRegistrations`, service-worker request handler.

- [ ] **Step 1: Write failing permission tests**

Cover exact-origin grant, denial, duplicate add, built-in add, restricted scheme, removal order, revoked-outside-extension reconciliation, privileged messages received from a content-script sender, and no storage write before grant. Verify content-script senders cannot add/remove/list sites, permission requests contain exactly one origin pattern, and the request is the first asynchronous Chrome API call after synchronous sender/message validation, normalization, and built-in-host rejection.

- [ ] **Step 2: Write failing registration tests**

Assert reconciliation creates two built-in registrations plus two registrations per custom origin, removes stale registrations, updates an existing registration whose files/world/runAt/matches differ, sets `persistAcrossSessions: true`, uses `document_start`, selects `ISOLATED` for bootstrap and `MAIN` for route bridge, registers both built-in scripts with `allFrames: true`, keeps both custom registrations top-frame-only, and is idempotent after simulated service-worker suspension. Every matching frame still passes the kernel's same-origin and adapter `frameSupport` checks before page processing.

- [ ] **Step 3: Confirm red**

Run: `npm run test:unit -- tests/unit/permissions.test.ts tests/unit/registrations.test.ts`

Expected: FAIL on missing lifecycle functions.

- [ ] **Step 4: Implement add/remove**

The popup reduces the active-tab URL to `URL.origin` before messaging. In the service worker's `onMessage` callback, synchronously require the sender to be a bundled extension page with no `sender.tab`, parse the message, normalize the origin, reject restricted/built-in hosts, and call `chrome.permissions.request` immediately with no intervening `await`; return `true` so the response channel remains open. After the permission promise grants, `addCustomSite({ tabId, origin })` deduplicates/persists the site, registers both scripts, and injects both bundles into the current tab. If immediate injection is rejected because of document lifecycle, return a reload-required result instead of retrying in a loop. `removeCustomSite` unregisters before storage deletion, removes the exact permission, and returns a reload-required result.

- [ ] **Step 5: Implement reconciliation and worker wiring**

Reconcile on install, update, startup, and Settings changes. Validate every incoming message with `parseMessage`. Return structured results; never throw rejected promises from listener callbacks.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:unit -- tests/unit/permissions.test.ts tests/unit/registrations.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add src/background tests/unit/permissions.test.ts tests/unit/registrations.test.ts
git commit -m "feat: manage exact-origin protection lifecycle"
```

### Task 13: Build accessible popup and Settings interfaces

**Files:**
- Replace: `src/popup/index.html`
- Replace: `src/popup/popup.ts`
- Replace: `src/popup/popup.css`
- Replace: `src/settings/index.html`
- Replace: `src/settings/settings.ts`
- Replace: `src/settings/settings.css`
- Test: `tests/unit/popup.test.ts`
- Test: `tests/unit/settings.test.ts`

**Interfaces:**
- Consumes: versioned messages, `PageStatus`, catalog/settings responses, `RULESET_VERSION`.
- Produces: six popup states, add-site action, built-in catalog display, custom-site removal.

- [ ] **Step 1: Write red popup rendering tests**

Test exact visible copy for `Protected`, `Protected with generic rules`, `Protection may need an update`, `Not yet protected`, `Permission not granted`, and `Unavailable on this page`. Assert the popup queries exactly one active tab, sends `GET_PAGE_STATUS` to that tab, reduces an eligible URL to scheme plus hostname before `ADD_CURRENT_SITE`, and never renders a path or query. Assert only eligible unsupported/denied states render **Block recommendations on this site**, all states render **Open Settings**, and protected/restricted states contain no pause/reveal/disable control.

- [ ] **Step 2: Write red Settings tests**

Assert 50 read-only built-ins, searchable filtering without persistence, custom ordering by `addedAt`, one Remove action per custom site, no built-in removal, a reload-required success announcement, installed extension version plus packaged adapter-rule version, and no page URL/title fields.

- [ ] **Step 3: Confirm red**

Run: `npm run test:unit -- tests/unit/popup.test.ts tests/unit/settings.test.ts`

Expected: FAIL because the views are inert.

- [ ] **Step 4: Implement popup**

Use semantic `<main>`, headings, native `<button>`, and `<a>`. Render all untrusted values with `textContent`. Put async results in a polite `aria-live` region, preserve visible focus, and keep the popup usable at 320 CSS pixels wide.

- [ ] **Step 5: Implement Settings**

Use a native search input, separate Built-in and Added by you sections, and a table/list that remains readable at 320 CSS pixels. Removal sends the exact scheme/hostname and updates the DOM only after a successful response.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:unit -- tests/unit/popup.test.ts tests/unit/settings.test.ts && npm run typecheck && npm run lint`

Expected: PASS.

```bash
git add src/popup src/settings tests/unit/popup.test.ts tests/unit/settings.test.ts
git commit -m "feat: add strict popup and site settings"
```

### Task 14: Build sanitized fixture capture, validation, and adapter contract tooling

**Files:**
- Create: `scripts/capture-fixture.mjs`
- Create: `scripts/sanitize-fixture.mjs`
- Create: `scripts/validate-fixtures.mjs`
- Create: `tests/helpers/adapter-contract.ts`
- Create: `tests/helpers/fixture-loader.ts`
- Test: `tests/unit/sanitize-fixture.test.ts`
- Test: `tests/unit/adapter-contract.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `sanitizeFixture(html, metadata)`, `loadFixture`, `assertAdapterContract(adapterId)`, fixture CLI scripts.

- [ ] **Step 1: Write red sanitizer tests**

Use a deliberately sensitive synthetic HTML string and assert scripts, media URLs, image URLs, free-form titles, input values, usernames, query values, and comments are absent. Assert structural IDs/classes, whitelisted `data-testid`/`data-role`, relative route shape, and interface labels such as `Related` survive.

- [ ] **Step 2: Write red contract-helper tests**

Create one synthetic fake-adapter fixture with `data-afb-expect="hide"`, `data-afb-expect="preserve"`, and `data-afb-expect="player"`. The helper must retain element references, remove test annotations before running production code, and assert final hidden/preserved state plus expected page class and auto-advance result.

- [ ] **Step 3: Confirm red**

Run: `npm run test:unit -- tests/unit/sanitize-fixture.test.ts tests/unit/adapter-contract.test.ts`

Expected: FAIL on missing tools.

- [ ] **Step 4: Implement in-memory-only capture and sanitization**

The capture script uses Playwright request interception to abort image, media, font, and websocket resources. It never writes raw HTML: `page.content()` flows directly into `sanitizeFixture`, then only sanitized HTML and metadata are written. It refuses pages that present access controls rather than bypassing them.

The sanitizer removes all scripts/styles/event handlers, blanks form values, rewrites media to inert placeholders, replaces non-interface text with deterministic `[text-N]` tokens, strips query values, and rejects output matching configured explicit-term/media-URL checks. Fixture metadata stores a synthetic URL using the real hostname and route shape but only `afb-fixture` as a query value.

- [ ] **Step 5: Implement validation and the shared adapter contract**

Reject missing page-kind metadata, unsanitized resources, absent expectations, production selectors containing `data-afb-expect`, and required selectors that match no corresponding fixture. The contract checks home/listing hiding, search/player preservation, dynamic insertion, route restore/reapply, health status, and auto-advance claims.

- [ ] **Step 6: Add scripts and verify**

Add `fixture:capture`, `fixture:sanitize`, and `fixture:validate` scripts. Run:

```bash
npm run test:unit -- tests/unit/sanitize-fixture.test.ts tests/unit/adapter-contract.test.ts
npm run fixture:validate
```

Expected: PASS against the synthetic helper fixture.

- [ ] **Step 7: Commit fixture tooling**

```bash
git add scripts/capture-fixture.mjs scripts/sanitize-fixture.mjs scripts/validate-fixtures.mjs tests/helpers tests/unit/sanitize-fixture.test.ts tests/unit/adapter-contract.test.ts package.json package-lock.json
git commit -m "test: add sanitized adapter fixture harness"
```

### Task 15: Implement the Aylo adapter family

**Files:**
- Create: `src/adapters/families/aylo.ts`
- Create: `src/adapters/sites/pornhub.ts`
- Create: `src/adapters/sites/youporn.ts`
- Create: `src/adapters/sites/redtube.ts`
- Create: `src/adapters/sites/tube8.ts`
- Create: `src/adapters/sites/thumbzilla.ts`
- Create: `tests/fixtures/{pornhub,youporn,redtube,tube8,thumbzilla}/`
- Create: `tests/adapters/aylo.test.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Consumes: `defineAdapter`, adapter contract harness, sanitized fixtures.
- Produces: five registered, independently versioned launch adapters.

- [ ] **Step 1: Capture and annotate sanitized fixtures**

For each adapter, capture at least home, blocked-listing, watch, and search structures with media requests blocked. Annotate only the sanitized copy. If a live page is restricted, construct the fixture from legally obtained page-shell markup and record `liveVerified: false` in metadata.

- [ ] **Step 2: Write the failing family contract test**

```ts
describe.each(["pornhub", "youporn", "redtube", "tube8", "thumbzilla"])(
  "%s adapter",
  (adapterId) => assertAdapterContract(adapterId)
);
```

- [ ] **Step 3: Confirm red**

Run: `npm run test:adapters -- tests/adapters/aylo.test.ts`

Expected: FAIL listing five unregistered adapter IDs.

- [ ] **Step 4: Implement shared and site-specific rules**

Derive route and selector literals only from the committed sanitized fixtures. Put a rule in `families/aylo.ts` only when it passes every consuming site's fixtures; otherwise keep it in the site file. Each site declares search/player protection, home/listing/feed rules, recommendation modules, health checks, and a verified auto-advance rule or explicit no-auto-advance evidence.

- [ ] **Step 5: Verify all five adapters and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/aylo.test.ts`

Expected: five adapter suites PASS with at least 20 fixtures.

```bash
git add src/adapters/families/aylo.ts src/adapters/sites/{pornhub,youporn,redtube,tube8,thumbzilla}.ts src/adapters/registry.ts tests/fixtures tests/adapters/aylo.test.ts
git commit -m "feat: support aylo tube platforms"
```

### Task 16: Implement the WGCZ adapter family

**Files:**
- Create: `src/adapters/families/wgcz.ts`
- Create: `src/adapters/sites/xvideos.ts`
- Create: `src/adapters/sites/xnxx.ts`
- Create: `tests/fixtures/{xvideos,xnxx}/`
- Create: `tests/adapters/wgcz.test.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: XVideos and XNXX adapters with protected search/player roots and SPA-safe hiding.

- [ ] **Step 1: Capture, sanitize, and annotate eight baseline fixtures**

Collect four required page classes per site without persisting raw HTML. Add end-screen or SPA fixtures when the watch shell differs after playback.

- [ ] **Step 2: Write and run the red contract suite**

Run: `npm run test:adapters -- tests/adapters/wgcz.test.ts`

Expected: FAIL for unregistered `xvideos` and `xnxx`.

- [ ] **Step 3: Implement the family and two adapters**

Share only fixture-proven route and DOM rules. Ensure search pagination remains present, category/performer grids are hidden, watch recommendations disappear, and auto-advance cannot change videos.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/wgcz.test.ts`

Expected: PASS.

```bash
git add src/adapters/families/wgcz.ts src/adapters/sites/{xvideos,xnxx}.ts src/adapters/registry.ts tests/fixtures tests/adapters/wgcz.test.ts
git commit -m "feat: support wgcz tube platforms"
```

### Task 17: Implement AVS adapters for Txxx, HClips, Upornia, PornDitt, and PornZog

**Files:**
- Create: `src/adapters/families/avs.ts`
- Create: `src/adapters/sites/{txxx,hclips,upornia,pornditt,pornzog}.ts`
- Create: `tests/fixtures/{txxx,hclips,upornia,pornditt,pornzog}/`
- Create: `tests/adapters/avs-core.test.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: AVS family foundation and five adapters; Txxx covers both `txxx.com` and `txxx.tube`.

- [ ] **Step 1: Capture and annotate at least 20 sanitized fixtures**

Verify the `.com` and `.tube` Txxx hosts against the same adapter; add an alias-specific fixture if their shells differ.

- [ ] **Step 2: Add the five-ID red contract suite and run it**

Run: `npm run test:adapters -- tests/adapters/avs-core.test.ts`

Expected: FAIL for all five missing registrations.

- [ ] **Step 3: Implement the AVS base and five adapters**

Keep alias classification inside adapter metadata. Shared AVS rules must match all five fixture sets; site-only deviations remain in their site modules. Mark search result roots before applying family-wide card rules.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/avs-core.test.ts`

Expected: PASS.

```bash
git add src/adapters/families/avs.ts src/adapters/sites/{txxx,hclips,upornia,pornditt,pornzog}.ts src/adapters/registry.ts tests/fixtures tests/adapters/avs-core.test.ts
git commit -m "feat: add core avs adapters"
```

### Task 18: Implement AVS adapters for HDZog, TheGay, OOXXX, HotMovs, and VJav

**Files:**
- Create: `src/adapters/sites/{hdzog,thegay,ooxxx,hotmovs,vjav}.ts`
- Create: `tests/fixtures/{hdzog,thegay,ooxxx,hotmovs,vjav}/`
- Create: `tests/adapters/avs-second.test.ts`
- Modify: `src/adapters/families/avs.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: five more AVS adapters; HDZog and TheGay include their `.tube` aliases.

- [ ] **Step 1: Capture and annotate at least 20 sanitized fixtures**

Add alias-specific fixtures for `hdzog.tube` and `thegay.tube` when their shells or canonical routes differ.

- [ ] **Step 2: Add and run the five-ID red contract suite**

Run: `npm run test:adapters -- tests/adapters/avs-second.test.ts`

Expected: FAIL for the five unregistered IDs.

- [ ] **Step 3: Implement site adapters and refine only proven family rules**

Any AVS family change must run both `avs-core.test.ts` and `avs-second.test.ts`; a shared rule that breaks one consumer returns to the appropriate site file.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/avs-core.test.ts tests/adapters/avs-second.test.ts`

Expected: ten AVS suites PASS.

```bash
git add src/adapters/families/avs.ts src/adapters/sites/{hdzog,thegay,ooxxx,hotmovs,vjav}.ts src/adapters/registry.ts tests/fixtures tests/adapters/avs-second.test.ts
git commit -m "feat: expand avs adapter coverage"
```

### Task 19: Complete AVS adapters for PornL, VoyeurHit, ManySex, TubePornClassic, and ShemaleZ

**Files:**
- Create: `src/adapters/sites/{pornl,voyeurhit,manysex,tubepornclassic,shemalez}.ts`
- Create: `tests/fixtures/{pornl,voyeurhit,manysex,tubepornclassic,shemalez}/`
- Create: `tests/adapters/avs-final.test.ts`
- Modify: `src/adapters/families/avs.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: the final five AVS adapters; ShemaleZ includes `shemalez.tube`.

- [ ] **Step 1: Capture and annotate at least 20 sanitized fixtures**

Add a `shemalez.tube` alias fixture if its route or shell differs from the primary hostname.

- [ ] **Step 2: Add and run the final AVS red contract suite**

Run: `npm run test:adapters -- tests/adapters/avs-final.test.ts`

Expected: FAIL for all five unregistered IDs.

- [ ] **Step 3: Implement the five adapters and stabilize the family**

Ensure the final family base passes all 15 sites without suppressing search, library, or player roots. Keep rule IDs stable and site-prefixed when they are not truly shared.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/avs-core.test.ts tests/adapters/avs-second.test.ts tests/adapters/avs-final.test.ts`

Expected: all 15 AVS suites PASS.

```bash
git add src/adapters/families/avs.ts src/adapters/sites/{pornl,voyeurhit,manysex,tubepornclassic,shemalez}.ts src/adapters/registry.ts tests/fixtures tests/adapters/avs-final.test.ts
git commit -m "feat: complete avs adapter family"
```

### Task 20: Implement the 8579 adapter family

**Files:**
- Create: `src/adapters/families/f8579.ts`
- Create: `src/adapters/sites/{fourkporn,crazyporn,love4porn,hoes}.ts`
- Create: `tests/fixtures/{fourkporn,crazyporn,love4porn,hoes}/`
- Create: `tests/adapters/f8579.test.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: adapters for `4kporn.xxx`, `crazyporn.xxx`, `love4porn.com`, and `hoes.tube`.

- [ ] **Step 1: Capture and annotate at least 16 sanitized fixtures**

Preserve literal route structure while removing all media and free-form text.

- [ ] **Step 2: Add and run the four-ID red contract suite**

Run: `npm run test:adapters -- tests/adapters/f8579.test.ts`

Expected: FAIL for four missing adapter IDs.

- [ ] **Step 3: Implement family and site rules**

Use `f8579` as the code identifier because TypeScript identifiers cannot begin with a digit. Protect query results before applying repeated-card rules.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/f8579.test.ts`

Expected: PASS.

```bash
git add src/adapters/families/f8579.ts src/adapters/sites/{fourkporn,crazyporn,love4porn,hoes}.ts src/adapters/registry.ts tests/fixtures tests/adapters/f8579.test.ts
git commit -m "feat: support 8579 tube platforms"
```

### Task 21: Implement first-half Trendio adapters

**Files:**
- Create: `src/adapters/families/trendio.ts`
- Create: `src/adapters/sites/{theyarehuge,trannyone,ahme,ashemale,bdsmone,bemyhole}.ts`
- Create: `tests/fixtures/{theyarehuge,trannyone,ahme,ashemale,bdsmone,bemyhole}/`
- Create: `tests/adapters/trendio-first.test.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: six registered Trendio adapters.

- [ ] **Step 1: Capture and annotate at least 24 sanitized fixtures**

Treat operator brand strings as metadata only; fixtures retain no explicit titles or user text.

- [ ] **Step 2: Add and run the six-ID red suite**

Run: `npm run test:adapters -- tests/adapters/trendio-first.test.ts`

Expected: FAIL for six missing registrations.

- [ ] **Step 3: Implement shared and site-specific rules**

Validate that any shared listing selector preserves search across every member. Add auto-advance support only from a confirmed control or hook in that site's fixture.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/trendio-first.test.ts`

Expected: PASS.

```bash
git add src/adapters/families/trendio.ts src/adapters/sites/{theyarehuge,trannyone,ahme,ashemale,bdsmone,bemyhole}.ts src/adapters/registry.ts tests/fixtures tests/adapters/trendio-first.test.ts
git commit -m "feat: add initial trendio adapters"
```

### Task 22: Complete Trendio adapters

**Files:**
- Create: `src/adapters/sites/{gaygo,gayxo,shemalepub,sunporno,yesvids}.ts`
- Create: `tests/fixtures/{gaygo,gayxo,shemalepub,sunporno,yesvids}/`
- Create: `tests/adapters/trendio-final.test.ts`
- Modify: `src/adapters/families/trendio.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: five more adapters and a complete 11-site Trendio family.

- [ ] **Step 1: Capture and annotate at least 20 sanitized fixtures**

Include an additional fixture wherever the site has a distinct end-screen or SPA watch transition.

- [ ] **Step 2: Add and run the five-ID red suite**

Run: `npm run test:adapters -- tests/adapters/trendio-final.test.ts`

Expected: FAIL for five missing registrations.

- [ ] **Step 3: Implement the five adapters and stabilize the family**

Run both Trendio suites after every shared-rule change. A shared rule remains only if all 11 adapters retain their protected roots.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/trendio-first.test.ts tests/adapters/trendio-final.test.ts`

Expected: all 11 suites PASS.

```bash
git add src/adapters/families/trendio.ts src/adapters/sites/{gaygo,gayxo,shemalepub,sunporno,yesvids}.ts src/adapters/registry.ts tests/fixtures tests/adapters/trendio-final.test.ts
git commit -m "feat: complete trendio adapter family"
```

### Task 23: Implement standalone adapters for xHamster, SpankBang, Eporner, and NoodleMagazine

**Files:**
- Create: `src/adapters/sites/{xhamster,spankbang,eporner,noodlemagazine}.ts`
- Create: `tests/fixtures/{xhamster,spankbang,eporner,noodlemagazine}/`
- Create: `tests/adapters/standalone-first.test.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: four independently implemented standalone adapters.

- [ ] **Step 1: Capture and annotate at least 16 sanitized fixtures**

Do not infer shared selectors merely because layouts look similar; these are standalone implementations.

- [ ] **Step 2: Add and run the four-ID red suite**

Run: `npm run test:adapters -- tests/adapters/standalone-first.test.ts`

Expected: FAIL for four missing registrations.

- [ ] **Step 3: Implement each adapter from its own fixtures**

Each file defines complete classification, protection, hiding, health, and auto-advance behavior. Keep every rule traceable to at least one fixture expectation.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/standalone-first.test.ts`

Expected: PASS.

```bash
git add src/adapters/sites/{xhamster,spankbang,eporner,noodlemagazine}.ts src/adapters/registry.ts tests/fixtures tests/adapters/standalone-first.test.ts
git commit -m "feat: add first standalone adapter set"
```

### Task 24: Implement standalone adapters for Mat6Tube, TuKif, HQPorner, and PornTrex

**Files:**
- Create: `src/adapters/sites/{mat6tube,tukif,hqporner,porntrex}.ts`
- Create: `tests/fixtures/{mat6tube,tukif,hqporner,porntrex}/`
- Create: `tests/adapters/standalone-second.test.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: four independently versioned standalone adapters.

- [ ] **Step 1: Capture and annotate at least 16 sanitized fixtures**

Where regional access prevents live capture, record `liveVerified: false` and use legally obtained sanitized page-shell structure without attempting circumvention.

- [ ] **Step 2: Add and run the four-ID red suite**

Run: `npm run test:adapters -- tests/adapters/standalone-second.test.ts`

Expected: FAIL for four missing registrations.

- [ ] **Step 3: Implement complete site-specific rules**

Validate search first, then listings, watch recommendations, mutations, and auto-advance for each site. Do not reuse selectors without fixture evidence.

- [ ] **Step 4: Verify and commit**

Run: `npm run fixture:validate && npm run test:adapters -- tests/adapters/standalone-second.test.ts`

Expected: PASS.

```bash
git add src/adapters/sites/{mat6tube,tukif,hqporner,porntrex}.ts src/adapters/registry.ts tests/fixtures tests/adapters/standalone-second.test.ts
git commit -m "feat: add second standalone adapter set"
```

### Task 25: Complete standalone adapters for Beeg, PornOne, xGroovy, HeavyFetish, and Motherless

**Files:**
- Create: `src/adapters/sites/{beeg,pornone,xgroovy,heavyfetish,motherless}.ts`
- Create: `tests/fixtures/{beeg,pornone,xgroovy,heavyfetish,motherless}/`
- Create: `tests/adapters/standalone-final.test.ts`
- Modify: `src/adapters/registry.ts`

**Interfaces:**
- Produces: the final five adapters and a registry containing all 50 catalog IDs.

- [ ] **Step 1: Capture and annotate at least 20 sanitized fixtures**

For Motherless, include a mixed-media feed fixture and mark the whole passive discovery container for hiding while preserving direct selected content and search results.

- [ ] **Step 2: Write the red final-coverage test**

In addition to five contract suites, assert:

```ts
expect(adapterRegistry.ids()).toEqual(catalog.map((entry) => entry.id));
expect(adapterRegistry.size).toBe(50);
```

- [ ] **Step 3: Run and confirm red**

Run: `npm run test:adapters -- tests/adapters/standalone-final.test.ts`

Expected: FAIL for five missing registrations and registry size 45.

- [ ] **Step 4: Implement the five adapters**

Use site-specific classification and rules. Treat mixed media only as required by the approved passive-feed behavior; do not broaden the product into an image-content classifier.

- [ ] **Step 5: Verify all 50 adapters and commit**

Run: `npm run fixture:validate && npm run test:adapters`

Expected: 50 adapter suites and at least 200 baseline fixtures PASS.

```bash
git add src/adapters/sites/{beeg,pornone,xgroovy,heavyfetish,motherless}.ts src/adapters/registry.ts tests/fixtures tests/adapters/standalone-final.test.ts
git commit -m "feat: complete fifty-site adapter coverage"
```

### Task 26: Prove generic precision and performance budgets

**Files:**
- Create: `tests/fixtures/generic/`
- Create: `tests/performance/generic-precision.test.ts`
- Create: `tests/performance/initial-scan.test.ts`
- Create: `tests/performance/mutation-budget.test.ts`
- Modify: `src/content/generic-detector.ts`
- Modify: `src/content/mutation-controller.ts`

**Interfaces:**
- Consumes: completed generic detector and content kernel.
- Produces: measurable 95% precision, initial-scan, and mutation budgets.

- [ ] **Step 1: Create a labeled mixed-page corpus**

Add at least 100 sanitized candidate containers balanced across recommendations, search results, players, account/library lists, navigation, and ordinary content. Store expected `hide`/`preserve` labels outside production-visible attributes and remove annotations before detection.

- [ ] **Step 2: Write the precision test**

Compute `precision = truePositives / (truePositives + falsePositives)` at container level. Assert precision `>= 0.95` and assert zero hidden protected roots. Do not set a recall gate.

- [ ] **Step 3: Write the performance tests**

Generate a deterministic 1,000-card fixture and assert p95 initial processing under 50 ms after five warmups and 30 measured runs on the reference machine. Insert 100 cards and assert no full scan and no measured batch over 50 ms.

- [ ] **Step 4: Run and confirm the red state**

Run: `npm run test:performance`

Expected: at least one threshold FAILS before tuning.

- [ ] **Step 5: Tune without weakening safety**

Optimize candidate enumeration, set lookups, subtree deduplication, and scheduling. Do not lower the generic threshold, remove protected-root checks, or change the acceptance numbers.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:performance && npm run test:unit`

Expected: PASS.

```bash
git add src/content/generic-detector.ts src/content/mutation-controller.ts tests/fixtures/generic tests/performance
git commit -m "perf: enforce detection and mutation budgets"
```

### Task 27: Add unpacked-extension end-to-end coverage

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/helpers/extension-context.ts`
- Create: `tests/extension/known-site.spec.ts`
- Create: `tests/extension/custom-site.spec.ts`
- Create: `tests/extension/spa.spec.ts`
- Create: `tests/extension/privacy.spec.ts`
- Create: `tests/extension/accessibility.spec.ts`

**Interfaces:**
- Consumes: `dist/`, sanitized fixtures, popup/Settings, service worker.
- Produces: browser verification of complete extension flows.

- [ ] **Step 1: Install bundled Chromium and write the red smoke test**

Run: `npx playwright install chromium`

Launch a persistent Chromium context with only `dist` loaded. Intercept a built-in HTTPS hostname and fulfill it from a sanitized fixture so the content script sees a real catalog hostname without contacting the live site. Assert the extension service worker appears and the known-site page is modified.

- [ ] **Step 2: Confirm red**

Run: `npm run build && npm run test:extension -- tests/extension/known-site.spec.ts`

Expected: FAIL until the context helper and worker discovery are correct.

- [ ] **Step 3: Cover known-site and SPA flows**

Verify document-start hiding, no recommendation flash in a trace/screenshot sequence, protected search/player nodes, late insertion, route restore/reapply, end-screen hiding, and ephemeral popup counts.

- [ ] **Step 4: Cover custom-site lifecycle**

Drive the popup click through the real service-worker handler. Where Chromium exposes a native permission prompt, accept and deny it in separate tests; otherwise exercise the same ChromeApi boundary with a deterministic extension-test build and retain one manual prompt check in the release checklist. Verify exact-origin registration and Settings removal. Restart the persistent browser context with retained extension storage and prove startup reconciliation restores only granted registrations; simulate an externally revoked permission and prove its stale registration and storage record are removed.

- [ ] **Step 5: Cover privacy and accessibility**

Open two fixture tabs with different hidden counts and prove popup/status responses stay tab-local. Exercise a declared matching same-origin frame plus an undeclared/cross-origin frame and prove only the former is processed. Record all requests initiated by extension origins and assert the list is empty. Inspect storage and messages for prohibited fields. Run keyboard navigation and accessibility snapshots for popup and Settings, including `aria-live` results and visible focus.

- [ ] **Step 6: Verify and commit**

Run: `npm run build && npm run test:extension`

Expected: all extension specs PASS.

```bash
git add playwright.config.ts tests/helpers/extension-context.ts tests/extension
git commit -m "test: verify complete extension workflows"
```

### Task 28: Add package policy checks and deterministic ZIP output

**Files:**
- Create: `scripts/check-package.mjs`
- Create: `scripts/package.mjs`
- Test: `tests/unit/package-policy.test.ts`

**Interfaces:**
- Consumes: production build and catalog.
- Produces: `artifacts/adult-feed-blocker-v0.1.0.zip` and a machine-enforced release policy.

- [ ] **Step 1: Write red package-policy tests**

Assert the built manifest has only allowed required permissions, exact generated built-in hosts, broad patterns only in optional permissions, no remotely hosted script URLs, no inline scripts, and all referenced files present. Scan text and binary file names for forbidden fixture/media artifacts and scan JavaScript for `eval`, `new Function`, analytics endpoints, and `fetch(`/XHR/WebSocket usage outside test files.

- [ ] **Step 2: Confirm red**

Run: `npm run build && npm run test:unit -- tests/unit/package-policy.test.ts`

Expected: FAIL because package scripts do not exist.

- [ ] **Step 3: Implement checks and packaging**

`check-package.mjs` exits nonzero with a file-specific reason. `package.mjs` uses the pinned `fflate` development dependency, runs the checker first, sorts ZIP entries, fixes timestamps to the source-date epoch, excludes source maps and tests, and names the artifact from `manifest.version`.

- [ ] **Step 4: Verify deterministic packaging**

Run `npm run package` twice and compare `shasum -a 256 artifacts/*.zip`.

Expected: the ZIP hash is identical across runs.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-package.mjs scripts/package.mjs tests/unit/package-policy.test.ts package.json package-lock.json
git commit -m "build: enforce extension package policy"
```

### Task 29: Document privacy, permissions, development, and manual release checks

**Files:**
- Create: `README.md`
- Create: `PRIVACY.md`
- Create: `CHANGELOG.md`
- Create: `docs/release/manual-smoke.md`
- Test: `tests/unit/docs-policy.test.ts`

**Interfaces:**
- Consumes: finished behavior and catalog.
- Produces: user/developer documentation and 50-row live-verification record.

- [ ] **Step 1: Write the red documentation-policy test**

Assert README documents allowed/blocked surfaces, custom-site add/remove, build/test commands, and no escape hatch. Assert PRIVACY documents local hostname storage, zero telemetry, zero extension-owned network calls, and permission rationale. Assert CHANGELOG identifies extension `0.1.0`, ruleset `1`, adapters added/repaired/live-verified, and contains no user-activity language. Assert the smoke checklist contains each catalog ID exactly once with fields for extension version, ruleset version, date, reachable/restricted, search preserved, player preserved, feeds blocked, auto-advance result, and notes.

- [ ] **Step 2: Confirm red**

Run: `npm run test:unit -- tests/unit/docs-policy.test.ts`

Expected: FAIL because documents do not exist.

- [ ] **Step 3: Write README, privacy policy, and release notes**

Use neutral, non-explicit language. Explain that the extension changes page presentation but does not stop the site from computing/loading recommendations and is not an ad blocker, tracker blocker, or parental-control product. Seed CHANGELOG with version `0.1.0`, ruleset `1`, the 50 launch adapters under Added, no repairs, and a live-verification summary that is finalized only from the smoke checklist.

- [ ] **Step 4: Generate the 50-row smoke checklist from the catalog**

Rows begin unverified and become release evidence only when a tester records a result. The instructions explicitly forbid bypassing authentication, age assurance, paywalls, or geographic controls and forbid committing screenshots or page content.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:unit -- tests/unit/docs-policy.test.ts && npm run format:check`

Expected: PASS.

```bash
git add README.md PRIVACY.md CHANGELOG.md docs/release/manual-smoke.md tests/unit/docs-policy.test.ts
git commit -m "docs: explain extension behavior and release checks"
```

### Task 30: Add CI and run the complete release gate

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: every previous task.
- Produces: one reproducible `npm run verify` gate and CI artifact.

- [ ] **Step 1: Add the failing aggregate command**

Add:

```json
{
  "scripts": {
    "verify": "npm run format:check && npm run typecheck && npm run lint && npm run fixture:validate && npm run test:coverage && npm run test:performance && npm run build && npm run test:extension && npm run check:package"
  }
}
```

Run: `npm run verify`

Expected: FAIL until every missing gate/configuration issue is resolved.

- [ ] **Step 2: Configure CI**

Use Ubuntu, Node 22.22.0, `npm ci`, Playwright Chromium installation with dependencies, `npm run verify`, and `npm run package`. Upload only the ZIP, test reports, and sanitized traces; never upload live captures or browser profiles.

- [ ] **Step 3: Run the complete local gate**

Run: `npm run verify`

Expected: PASS with 50 registered adapters, at least 200 sanitized baseline fixtures, zero hidden protected roots, generic precision at least 95%, performance within both 50 ms budgets, and no extension-owned requests.

- [ ] **Step 4: Inspect the production artifact**

Run:

```bash
npm run package
unzip -l artifacts/*.zip
git status --short
```

Expected: archive contains only production manifest/assets/bundles; working tree contains no unexpected generated or sensitive files.

- [ ] **Step 5: Perform legally accessible manual smoke checks**

Complete all reachable rows in `docs/release/manual-smoke.md`. Mark inaccessible services as `restricted` with the date, extension version, and ruleset version; do not attempt circumvention. Confirm the toolbar action's real permission approval and denial paths once in a normal Chrome profile. Update CHANGELOG's live-verification summary from those rows without adding page URLs, titles, searches, or other user activity.

- [ ] **Step 6: Re-run verification after smoke-test fixes**

Run: `npm run verify && git diff --check`

Expected: PASS and no whitespace errors.

- [ ] **Step 7: Commit the release gate**

```bash
git add .github/workflows/ci.yml package.json package-lock.json CHANGELOG.md docs/release/manual-smoke.md
git commit -m "ci: enforce extension release gate"
```

---

## Execution Checkpoints

1. **Kernel checkpoint — after Task 14:** The extension builds, permission lifecycle and UI work against fakes, generic blocking is functional, and sanitized adapter tooling is ready. Review architecture and privacy boundaries before site work.
2. **Family checkpoint — after Task 22:** Aylo, WGCZ, AVS, 8579, and Trendio adapters pass their full fixture contracts. Review shared-family selectors for overreach.
3. **Coverage checkpoint — after Task 25:** All 50 adapters and at least 200 fixtures pass. Review search/player false-positive evidence before performance tuning.
4. **Release checkpoint — after Task 30:** Full verification, package audit, accessibility, privacy, performance, and legally permissible live smoke evidence pass.

## Definition of Done

- `npm run verify` exits 0 from a clean checkout after `npm ci` and Playwright Chromium installation.
- The generated manifest contains exactly the approved persistent host coverage and no forbidden permission.
- Registry size is exactly 50 and every catalog entry has a contract-tested adapter.
- At least 200 sanitized baseline fixtures are committed; no unsanitized/explicit media or text is present.
- Search/player false-positive count is zero in the fixture corpus.
- Generic precision is at least 95%; recall remains intentionally ungated.
- Initial scan and 100-node mutation batches satisfy their 50 ms budgets.
- Popup has no reveal/disable action; Settings removes only custom sites.
- Custom origin grant, persistence, registration, removal, and reconciliation tests pass.
- Production code and package make no extension-owned network request.
- The deterministic ZIP passes package policy inspection.
- Manual checks are recorded for every reachable launch site without bypassing access controls.
