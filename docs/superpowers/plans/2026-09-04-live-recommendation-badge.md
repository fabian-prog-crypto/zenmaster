# Zen Master Live Recommendation Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the current page's exact number of hidden recommendation video thumbnails as a per-tab toolbar badge and in the popup.

**Architecture:** Count unique video-card DOM elements only inside roots Zen Master has already hidden, using immutable adapter card selectors plus a conservative structural fallback. The content kernel publishes an ephemeral integer to the service worker, which owns tab-scoped Chrome badge rendering and navigation clearing; no page data is stored or transmitted.

**Tech Stack:** TypeScript 6.0.3, Chrome Manifest V3 `chrome.action`, esbuild 0.28.2, Vitest 5.0.0 with happy-dom, Playwright 1.62.1; zero runtime dependencies.

## Global Constraints

- Keep product branding exactly `Zen Master` with the 🧘 meditation mark.
- Preserve the no-pause, no-reveal, no-disable product behavior.
- Count individual recommendation thumbnail cards, not hidden containers or links.
- Show the live count for the current page only; never accumulate across routes, tabs, or sessions.
- Display blank for zero, exact values from `1` through `99`, and `99+` above 99.
- Never count or hide search results, the selected player, or user-owned library content.
- Keep counts memory-only; never write them to `chrome.storage` or send page URLs, titles, text, or media identifiers.
- Add no permissions, runtime dependencies, or production network requests.
- Preserve the current Pornhub right-rail regression and deterministic small-size icon repair.

---

## File Map

- `src/adapters/types.ts` — adds the immutable optional card-selector contract.
- `src/adapters/families/profiles.ts` — provides common and Pornhub-specific card selectors.
- `src/adapters/site-factory.ts` — installs card selectors on catalog adapters.
- `src/content/blocker.ts` — exposes a read-only snapshot of currently connected owned hidden roots.
- `src/content/recommendation-counter.ts` — counts unique cards inside hidden roots without scanning the page.
- `src/shared/status.ts` — adds `blockedVideoCount` to page status.
- `src/content/bootstrap.ts` — recomputes and publishes live status after initialization, mutations, and routes.
- `src/shared/messages.ts` — validates the closed-shape badge message.
- `src/background/badge.ts` — formats and applies per-tab badge state.
- `src/background/chrome-api.ts` — wraps badge API calls for testability.
- `src/background/service-worker.ts` — accepts trusted content messages and clears badges on navigation.
- `src/popup/popup.ts` — shows the exact video count.
- `tests/unit/recommendation-counter.test.ts` — card counting and deduplication.
- `tests/unit/bootstrap.test.ts` — live status publication lifecycle.
- `tests/unit/messages.test.ts` — badge message validation.
- `tests/unit/badge.test.ts` — badge formatting and API behavior.
- `tests/unit/pornhub-adapter.test.ts` — reported two-card sidebar regression.
- `tests/unit/popup.test.ts` — individual-video wording.
- `tests/extension/known-site.spec.ts` — real extension-context badge verification.

---

### Task 1: Land the Pornhub sidebar and icon repairs

**Files:**

- Modify: `src/adapters/families/profiles.ts`
- Modify: `src/icons/zen-master.svg`
- Modify: `src/icons/zen-master-{16,32,48,128}.png`
- Modify: `tests/unit/build.test.ts`
- Create: `tests/unit/pornhub-adapter.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**

- Consumes: existing `SiteAdapter.globalRecommendationSelectors`, `Blocker.applyRules`, and manifest icon map.
- Produces: a Pornhub rule for `#hd-rightColVideoPage` and platform-independent toolbar PNGs.

- [ ] **Step 1: Run the focused regression tests**

Run:

```bash
npx vitest run tests/unit/pornhub-adapter.test.ts tests/unit/build.test.ts --fileParallelism=false
```

Expected: both tests pass; the sidebar receives `data-afb-hidden`, the player has no hidden ancestor, and the SVG contains `data-mark="meditation"` without `Apple Color Emoji`.

- [ ] **Step 2: Inspect the small icon visually**

Open `src/icons/zen-master-16.png`, `src/icons/zen-master-32.png`, and `src/icons/zen-master-128.png`. Confirm the flat head/body/arms/legs remain recognizable at 16 px and do not depend on an installed emoji font.

- [ ] **Step 3: Run the baseline release gate**

Run:

```bash
npm run verify
```

Expected: 237 tests plus extension E2E pass before badge work begins.

- [ ] **Step 4: Commit**

```bash
git add src/adapters/families/profiles.ts src/icons tests/unit/build.test.ts tests/unit/pornhub-adapter.test.ts vitest.config.ts
git commit -m "fix: cover Pornhub sidebar and repair icon"
```

---

### Task 2: Count unique recommendation cards inside hidden roots

**Files:**

- Modify: `src/adapters/types.ts`
- Modify: `src/adapters/families/profiles.ts`
- Modify: `src/adapters/site-factory.ts`
- Modify: `src/content/blocker.ts`
- Create: `src/content/recommendation-counter.ts`
- Create: `tests/unit/recommendation-counter.test.ts`

**Interfaces:**

- Consumes: `Blocker.hiddenRoots`, `SiteAdapter.recommendationCardSelectors`.
- Produces: `countRecommendationCards(roots: readonly Element[], selectors?: readonly string[]): number`.

- [ ] **Step 1: Write the failing counter tests**

```ts
import { describe, expect, it } from "vitest";
import { countRecommendationCards } from "../../src/content/recommendation-counter.js";

describe("recommendation card", () => {
  it("counts two cards rather than their duplicate links", () => {
    document.body.innerHTML = `<aside data-afb-hidden>
      <li class="pcVideoListItem"><a href="/view_video.php?viewkey=one">image</a><a href="/view_video.php?viewkey=one">title</a></li>
      <li class="pcVideoListItem"><a href="/view_video.php?viewkey=two">image</a><a href="/view_video.php?viewkey=two">title</a></li>
    </aside>`;
    expect(countRecommendationCards([document.querySelector("aside")!], [".pcVideoListItem"])).toBe(
      2
    );
  });

  it("ignores disconnected roots and falls back to one unknown card root", () => {
    const root = document.createElement("article");
    root.innerHTML = `<a href="/watch/item">video</a>`;
    document.body.append(root);
    expect(countRecommendationCards([root], [".missing"])).toBe(1);
    root.remove();
    expect(countRecommendationCards([root], [".missing"])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npx vitest run tests/unit/recommendation-counter.test.ts --fileParallelism=false
```

Expected: FAIL because `recommendation-counter.ts` does not exist.

- [ ] **Step 3: Add the adapter and blocker contracts**

Add to `SiteAdapter`:

```ts
recommendationCardSelectors?: readonly string[];
```

Add to `Blocker`:

```ts
get hiddenRoots(): readonly Element[] {
  this.#purgeDisconnected();
  return [...this.#owned];
}
```

In `profiles.ts`, export a function returning immutable common card selectors, including `.pcVideoListItem`, `.video-card`, `.video-item`, `.thumb-block`, `[data-video-id]`, `[data-testid*='video-card' i]`, `li`, and `article`. In `site-factory.ts`, assign that list to `recommendationCardSelectors`.

- [ ] **Step 4: Implement the focused counter**

```ts
const VIDEO_PATH = /(?:\/view_video\.php|\/videos?(?:\/|$)|\/watch(?:\/|$)|\/v\/)/i;

export function countRecommendationCards(
  roots: readonly Element[],
  selectors: readonly string[] = DEFAULT_CARD_SELECTORS
): number {
  const cards = new Set<Element>();
  const selector = selectors.join(",");
  for (const root of roots) {
    if (!root.isConnected) continue;
    let foundInRoot = false;
    for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      if (!isLikelyVideoLink(anchor)) continue;
      const card = anchor.closest(selector);
      if (!card || (!root.contains(card) && card !== root)) continue;
      cards.add(card);
      foundInRoot = true;
    }
    if (!foundInRoot && root.matches(selector) && hasLikelyVideoLink(root)) cards.add(root);
    if (!foundInRoot && hasLikelyVideoLink(root)) cards.add(root);
  }
  return cards.size;
}

function isLikelyVideoLink(anchor: HTMLAnchorElement): boolean {
  try {
    return VIDEO_PATH.test(new URL(anchor.href, document.baseURI).pathname);
  } catch {
    return false;
  }
}
```

Keep helpers module-private and never retain link strings after the call.

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run tests/unit/recommendation-counter.test.ts tests/unit/pornhub-adapter.test.ts --fileParallelism=false
git add src/adapters src/content/blocker.ts src/content/recommendation-counter.ts tests/unit/recommendation-counter.test.ts
git commit -m "feat: count hidden recommendation cards"
```

Expected: PASS with exactly two Pornhub sidebar cards.

---

### Task 3: Publish exact live counts from the content kernel

**Files:**

- Modify: `src/shared/status.ts`
- Modify: `src/content/bootstrap.ts`
- Modify: `tests/unit/bootstrap.test.ts`
- Modify: `tests/unit/popup.test.ts`

**Interfaces:**

- Consumes: `countRecommendationCards`, `Blocker.hiddenRoots`, adapter card selectors.
- Produces: `PageStatus.blockedVideoCount: number` and optional `ContentKernelOptions.onStatusChange(status: PageStatus): void`.

- [ ] **Step 1: Write failing status lifecycle tests**

Extend the Pornhub content-kernel test with two `.pcVideoListItem` cards and assert:

```ts
const updates: PageStatus[] = [];
const kernel = createContentKernel({
  page: document,
  url: new URL("https://pornhub.com/view_video.php?viewkey=item"),
  registry: adapterRegistry,
  observe: false,
  inFrame: false,
  onStatusChange: (status) => updates.push(status)
});
kernel.start();
expect(kernel.getStatus().blockedVideoCount).toBe(2);
expect(updates.at(-1)?.blockedVideoCount).toBe(2);
```

Add a route reinitialization test that replaces the DOM with no recommendation cards and expects the latest published count to be zero, not two.

- [ ] **Step 2: Run the focused tests to verify failure**

```bash
npx vitest run tests/unit/bootstrap.test.ts --fileParallelism=false
```

Expected: FAIL because `blockedVideoCount` and `onStatusChange` do not exist.

- [ ] **Step 3: Implement status recomputation and publication**

Add `blockedVideoCount: number` to every `PageStatus`. In `createContentKernel`, centralize assignment:

```ts
const publish = (next: PageStatus) => {
  status = {
    ...next,
    blockedVideoCount: countRecommendationCards(
      blocker?.hiddenRoots ?? [],
      adapter?.recommendationCardSelectors
    )
  };
  options.onStatusChange?.({ ...status });
};
```

Use `publish` after initial blocking, every mutation batch, restricted/unsupported initialization, and route reinitialization. Initialize `blockedVideoCount` to zero and ensure `stop()` does not publish stale data.

- [ ] **Step 4: Run tests and commit**

```bash
npx vitest run tests/unit/bootstrap.test.ts tests/unit/popup.test.ts --fileParallelism=false
git add src/shared/status.ts src/content/bootstrap.ts tests/unit/bootstrap.test.ts tests/unit/popup.test.ts
git commit -m "feat: publish live hidden video counts"
```

Expected: PASS; route changes replace the count.

---

### Task 4: Render and clear the tab-scoped toolbar badge

**Files:**

- Modify: `src/shared/messages.ts`
- Create: `src/background/badge.ts`
- Modify: `src/background/chrome-api.ts`
- Modify: `src/background/service-worker.ts`
- Modify: `src/content/bootstrap.ts`
- Modify: `tests/helpers/chrome-fake.ts`
- Modify: `tests/unit/messages.test.ts`
- Create: `tests/unit/badge.test.ts`

**Interfaces:**

- Consumes: `{ version: 1; type: "SET_TAB_BADGE"; count: number }` from top-frame content scripts.
- Produces: `formatBadgeCount(count: number): string` and `setTabBadge(api: ChromeApi, tabId: number, count: number): Promise<void>`.

- [ ] **Step 1: Write failing validation and formatting tests**

```ts
expect(parseMessage({ version: 1, type: "SET_TAB_BADGE", count: 2 })).toEqual({
  ok: true,
  value: { version: 1, type: "SET_TAB_BADGE", count: 2 }
});
for (const count of [-1, 1.5, Number.NaN, 1_000_001]) {
  expect(parseMessage({ version: 1, type: "SET_TAB_BADGE", count })).toEqual({
    ok: false,
    error: "invalid-message"
  });
}
expect([0, 1, 99, 100].map(formatBadgeCount)).toEqual(["", "1", "99", "99+"]);
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npx vitest run tests/unit/messages.test.ts tests/unit/badge.test.ts --fileParallelism=false
```

Expected: FAIL for the unknown message and missing formatter.

- [ ] **Step 3: Implement message and badge APIs**

Add the request variant and closed-shape validation:

```ts
| { version: 1; type: "SET_TAB_BADGE"; count: number }
```

Accept only integer `count` values from 0 through 1,000,000. Add to `ChromeApi`:

```ts
setBadgeText(tabId: number, text: string): Promise<void>;
setBadgeBackgroundColor(tabId: number, color: string): Promise<void>;
```

Implement `badge.ts`:

```ts
export const BADGE_COLOR = "#9a5b2f";

export function formatBadgeCount(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

export async function setTabBadge(api: ChromeApi, tabId: number, count: number): Promise<void> {
  await Promise.all([
    api.setBadgeText(tabId, formatBadgeCount(count)),
    api.setBadgeBackgroundColor(tabId, BADGE_COLOR)
  ]);
}
```

- [ ] **Step 4: Wire trusted sender handling and navigation clearing**

In the service worker, handle `SET_TAB_BADGE` before extension-page privilege checks. Require `sender.id === chrome.runtime.id`, an integer `sender.tab.id`, `sender.frameId === 0`, and an HTTP(S) `sender.url`. Send only `{ ok: true }` or `{ ok: false, error }`.

Add:

```ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") void setTabBadge(api, tabId, 0).catch(() => undefined);
});
```

In the top-frame production bootstrap, provide `onStatusChange` and send only the integer:

```ts
onStatusChange: frame.inFrame
  ? undefined
  : (status) => {
      void chrome.runtime
        .sendMessage({ version: 1, type: "SET_TAB_BADGE", count: status.blockedVideoCount })
        .catch(() => undefined);
    };
```

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run tests/unit/messages.test.ts tests/unit/badge.test.ts tests/unit/bootstrap.test.ts --fileParallelism=false
git add src/shared/messages.ts src/background src/content/bootstrap.ts tests/helpers/chrome-fake.ts tests/unit/messages.test.ts tests/unit/badge.test.ts tests/unit/bootstrap.test.ts
git commit -m "feat: show per-tab recommendation badge"
```

Expected: all badge tests pass without adding a manifest permission.

---

### Task 5: Update popup copy and verify the complete extension

**Files:**

- Modify: `src/popup/popup.ts`
- Modify: `tests/unit/popup.test.ts`
- Modify: `tests/extension/known-site.spec.ts`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `PageStatus.blockedVideoCount` and Chrome's action badge.
- Produces: exact popup wording and end-to-end release evidence.

- [ ] **Step 1: Write failing UI and extension tests**

Update the popup expectation:

```ts
expect(document.body.textContent).toContain("4 video recommendations hidden");
expect(document.body.textContent).not.toContain("recommendation areas");
```

In the Playwright known-site test, use a watch fixture containing two right-rail cards and assert from the service worker:

```ts
await expect
  .poll(() =>
    extension!.worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: "https://pornhub.com/*" });
      return tab.id ? await chrome.action.getBadgeText({ tabId: tab.id }) : "";
    })
  )
  .toBe("2");
```

- [ ] **Step 2: Run tests to verify the old wording and missing badge fail**

```bash
npx vitest run tests/unit/popup.test.ts --fileParallelism=false
npm run build && npm run test:extension
```

Expected: popup wording and E2E badge assertions fail before implementation completion.

- [ ] **Step 3: Update copy and release notes**

Render:

```ts
`${status.blockedVideoCount} video recommendation${status.blockedVideoCount === 1 ? "" : "s"} hidden`;
```

Document the live badge, exact popup count, `99+` cap, memory-only behavior, Pornhub sidebar repair, and icon repair in README and CHANGELOG.

- [ ] **Step 4: Run the full verification and deterministic package gates**

```bash
npm run verify
npm run package
shasum -a 256 artifacts/zen-master-v0.1.0.zip
npm run package
shasum -a 256 artifacts/zen-master-v0.1.0.zip
git diff --check
```

Expected: 238 or more unit/adapter tests, all performance tests, both extension E2E tests, package policy, and identical package hashes pass.

- [ ] **Step 5: Commit**

```bash
git add src/popup/popup.ts tests/unit/popup.test.ts tests/extension/known-site.spec.ts README.md CHANGELOG.md
git commit -m "docs: explain live recommendation counts"
```

- [ ] **Step 6: Reload the installed unpacked extension**

Open `chrome://extensions`, click Zen Master's reload button, then reload the active Pornhub page. Confirm the toolbar badge reads `2`, the two right-rail recommendations are hidden, the selected player remains usable, and the repaired meditation icon is crisp.
