# Adult Tube Recommendation Blocker — Product and Technical Design

**Status:** Approved for implementation planning

**Date:** 2026-09-04

**Target:** Google Chrome desktop, Manifest V3

**Working name:** Adult Feed Blocker

## 1. Summary

Adult Feed Blocker is a privacy-first Chrome extension that removes passive discovery surfaces from adult tube sites while preserving intentional access. Users may search for a video, open a direct video URL, or use their own saved library. They do not see home feeds, category listings, performer listings, related videos, trending sections, autoplay-next prompts, or end-of-video recommendations.

Version 1 ships with dedicated adapters for 50 Europe-relevant adult tube platforms. A toolbar action, **Block recommendations on this site**, lets a user grant access to an additional hostname and activate a conservative generic detector there. The extension provides no quick reveal, pause, or per-site disable control. A manually added hostname can be removed only from the extension Settings page.

All classification, blocking, configuration, and status computation happen on-device. The extension stores no browsing history, URLs, titles, search terms, or video information, and it sends no telemetry.

## 2. Goals

1. Remove passive and algorithmic discovery surfaces from the 50 supported platforms.
2. Preserve intentional discovery through site search.
3. Preserve direct video playback and user-owned libraries such as favorites, history, and playlists.
4. Prevent automatic advancement from the current video to another video.
5. Hide dynamically inserted recommendations without repeatedly scanning the full document.
6. Let users add an unsupported hostname with one toolbar action and remove it from Settings.
7. Keep all user data and decisions local to the browser.
8. Make selector breakage detectable and adapter maintenance isolated.

## 3. Non-goals

Version 1 does not:

- Block access to pornography or act as parental-control software.
- Decide whether a user is old enough to access a site.
- Bypass authentication, paywalls, age assurance, or geographic restrictions.
- Block advertisements, trackers, pop-ups, malware, or site network requests.
- Prevent a site from computing or downloading recommendations before they are hidden.
- Analyze images, video, audio, or explicit-content semantics.
- Support live-cam, dating, creator-subscription, or image-only platforms as product categories.
- Promise reliable generic blocking on every unsupported site.
- Provide an element picker or custom selector editor.
- Provide cloud accounts, synchronized settings, telemetry, or remote rule delivery.
- Support non-Chromium browsers, mobile Chrome, or native applications.
- Block general-purpose feeds such as YouTube or social media in version 1.

## 4. Product principles

### 4.1 Intentional access is allowed

The extension distinguishes an explicit user request from passive discovery. Search results, direct URLs, and a user's saved items remain usable. Browsing mechanisms selected by the site to encourage continued discovery are hidden even when they are not personalized.

### 4.2 No extension-provided escape hatch

The popup does not expose pause, reveal, or disable controls. Built-in sites cannot be removed in Settings. Chrome's own extension-management controls remain available because an extension cannot and should not override browser-level user control.

### 4.3 Least privilege

The extension has persistent host access only to the built-in site list. To support arbitrary user-added sites, the manifest declares optional HTTP(S) host capability, but that capability is not granted at installation. After the user invokes the toolbar action, the extension asks Chrome for only the current exact origin. It never asks the user to grant a blanket `<all_urls>` permission and never holds access to origins the user did not add.

### 4.4 Local and inspectable

Rules and executable code are packaged with the extension. Rule changes arrive only through a signed extension release. There are no extension-owned production network requests.

## 5. Page behavior

### 5.1 Page classes

Every adapter classifies the current document into one of these page classes, in this precedence order:

1. `restricted`: browser pages, age-assurance flows, login, checkout, legal, or access-denied pages.
2. `search`: a genuine query-results page.
3. `library`: user history, favorites, saved videos, subscriptions, or user-created playlists.
4. `watch`: a page whose primary purpose is playing one selected video.
5. `blocked-listing`: category, tag, performer, model, studio, channel, trending, popular, recent, best, or comparable discovery listing.
6. `home`: a site landing page or primary discovery feed.
7. `unknown`: a page that the adapter cannot classify safely.

The precedence prevents a URL containing a category-like token inside a search or account route from being misclassified.

### 5.2 Behavior matrix

| Page class | Primary content | Secondary recommendations | Auto-advance |
|---|---|---|---|
| `restricted` | Preserve | Preserve | Do not intervene |
| `search` | Preserve search form and results | Hide only adapter-confirmed recommendation modules | Block if present |
| `library` | Preserve user-owned lists | Hide adapter-confirmed recommendation modules | Block if present |
| `watch` | Preserve selected player, title, and essential controls | Hide all recommendation modules | Block |
| `blocked-listing` | Hide the discovery listing | Hide | Block |
| `home` | Hide the discovery feed | Hide | Block |
| `unknown` | Preserve | Apply only high-confidence site or generic rules | Block only through a confirmed control |

Direct-video autoplay remains under the site's normal behavior. The extension blocks only automatic transition to a different video.

### 5.3 Blocked surfaces

- Homepage and landing-page video feeds
- Category, tag, performer, model, studio, and channel listings
- Trending, popular, recent, best, featured, and comparable listings
- Related, similar, recommended, and "you may also like" modules
- Suggested-video sidebars and carousels
- "Up next" overlays, countdowns, and next-video controls
- End-of-video recommendation overlays
- Infinite-scroll or dynamically inserted recommendation cards

### 5.4 Preserved surfaces

- Site search input, filters, pagination, and genuine results
- The selected video and essential player controls
- Direct links and browser bookmarks
- User history, favorites, saved videos, subscriptions, and user-created playlists
- Login, logout, account, billing, privacy, legal, and age-assurance flows
- Site navigation required to reach search or account functions

## 6. Launch coverage

The launch requirement is 50 platform adapters. This is a coverage set, not a claim that the entries are precisely Europe's 50 highest-traffic sites. Brand names that may be dated or offensive are recorded only because they are the operators' exact site names and are required for unambiguous adapter identification.

| # | Adapter ID | Platform | Primary hostname |
|---:|---|---|---|
| 1 | `pornhub` | Pornhub | `pornhub.com` |
| 2 | `xvideos` | XVideos | `xvideos.com` |
| 3 | `xnxx` | XNXX | `xnxx.com` |
| 4 | `xhamster` | xHamster | `xhamster.com` |
| 5 | `youporn` | YouPorn | `youporn.com` |
| 6 | `redtube` | RedTube | `redtube.com` |
| 7 | `tube8` | Tube8 | `tube8.com` |
| 8 | `spankbang` | SpankBang | `spankbang.com` |
| 9 | `txxx` | Txxx | `txxx.com` |
| 10 | `eporner` | Eporner | `eporner.com` |
| 11 | `noodlemagazine` | NoodleMagazine | `noodlemagazine.com` |
| 12 | `mat6tube` | Mat6Tube | `mat6tube.com` |
| 13 | `tukif` | TuKif | `tukif.com` |
| 14 | `hclips` | HClips | `hclips.com` |
| 15 | `hqporner` | HQPorner | `hqporner.com` |
| 16 | `porntrex` | PornTrex | `porntrex.com` |
| 17 | `upornia` | Upornia | `upornia.com` |
| 18 | `beeg` | Beeg | `beeg.com` |
| 19 | `thumbzilla` | Thumbzilla | `thumbzilla.com` |
| 20 | `pornone` | PornOne | `pornone.com` |
| 21 | `xgroovy` | xGroovy | `xgroovy.com` |
| 22 | `heavyfetish` | HeavyFetish | `heavyfetish.com` |
| 23 | `pornditt` | PornDitt | `pornditt.com` |
| 24 | `pornzog` | PornZog | `pornzog.com` |
| 25 | `hdzog` | HDZog | `hdzog.com` |
| 26 | `thegay` | TheGay | `thegay.com` |
| 27 | `ooxxx` | OOXXX | `ooxxx.com` |
| 28 | `hotmovs` | HotMovs | `hotmovs.com` |
| 29 | `vjav` | VJav | `vjav.com` |
| 30 | `pornl` | PornL | `pornl.com` |
| 31 | `voyeurhit` | VoyeurHit | `voyeurhit.com` |
| 32 | `manysex` | ManySex | `manysex.com` |
| 33 | `tubepornclassic` | TubePornClassic | `tubepornclassic.com` |
| 34 | `shemalez` | ShemaleZ | `shemalez.com` |
| 35 | `fourkporn` | 4K Porn | `4kporn.xxx` |
| 36 | `crazyporn` | CrazyPorn | `crazyporn.xxx` |
| 37 | `love4porn` | Love4Porn | `love4porn.com` |
| 38 | `hoes` | Hoes | `hoes.tube` |
| 39 | `motherless` | Motherless | `motherless.com` |
| 40 | `theyarehuge` | TheyAreHuge | `theyarehuge.com` |
| 41 | `trannyone` | Tranny One | `tranny.one` |
| 42 | `ahme` | AH-ME | `ah-me.com` |
| 43 | `ashemale` | AShemale | `ashemale.one` |
| 44 | `bdsmone` | BDSM One | `bdsm.one` |
| 45 | `bemyhole` | BeMyHole | `bemyhole.com` |
| 46 | `gaygo` | GayGo | `gaygo.tv` |
| 47 | `gayxo` | GayXO | `gayxo.com` |
| 48 | `shemalepub` | Shemale Pub | `shemale.pub` |
| 49 | `sunporno` | SunPorno | `sunporno.com` |
| 50 | `yesvids` | YesVids | `yesvids.com` |

The following alternate hostnames are included in their corresponding adapter and do not count as separate platforms:

- `txxx.tube`
- `hdzog.tube`
- `thegay.tube`
- `shemalez.tube`
- The `www` hostname for every primary hostname

No other mirror or lookalike hostname is treated as built-in in version 1.

## 7. Architecture

### 7.1 Components

1. **Service worker** — installs and reconciles registered content scripts, handles custom-host permissions, and exposes settings operations.
2. **Adapter registry** — resolves a hostname to a dedicated adapter and provides immutable adapter metadata.
3. **Page classifier** — converts the current URL and stable DOM signals into one page class.
4. **Protection registry** — identifies DOM roots that must never be hidden, including search results and the selected player.
5. **Blocking engine** — applies precise rules, marks hidden nodes, watches mutations, and restores extension-hidden nodes on route changes before reclassification.
6. **Generic detector** — scores candidate recommendation containers on user-added or degraded known sites.
7. **Route bridge** — a minimal packaged main-world script that emits a route-change event for `history.pushState` and `history.replaceState`; it contains no site rules and reads no page data.
8. **Popup** — displays current protection state and provides the add-site action when eligible.
9. **Settings page** — displays built-in coverage and removes custom hostnames.
10. **Test harness** — runs adapter contract tests against sanitized fixtures and end-to-end extension flows in Chromium.

### 7.2 Module boundaries

Suggested source layout:

```text
src/
  adapters/
    families/
    sites/
    registry.ts
    types.ts
  background/
    service-worker.ts
    registrations.ts
    permissions.ts
  content/
    bootstrap.ts
    blocker.ts
    classifier.ts
    generic-detector.ts
    mutation-controller.ts
    protection-registry.ts
    route-bridge.ts
  popup/
  settings/
  shared/
    messages.ts
    status.ts
    storage.ts
tests/
  fixtures/<adapter-id>/
  unit/
  extension/
```

Site files contain data and narrowly scoped hooks. They do not access Chrome storage, permissions, popup state, or unrelated adapters. The blocking engine does not contain hostname-specific conditionals.

### 7.3 Adapter families

Adapters may inherit selectors and route rules from a tested family profile, then override only differences. Family reuse is an implementation device; every platform still has its own adapter ID and fixture suite.

Initial family candidates are:

- Aylo family: Pornhub, YouPorn, RedTube, Tube8, Thumbzilla
- WGCZ family: XVideos, XNXX
- AVS/TubeCorporate family: Txxx, HClips, Upornia, PornDitt, PornZog, HDZog, TheGay, OOXXX, HotMovs, VJav, PornL, VoyeurHit, ManySex, TubePornClassic, ShemaleZ
- 8579 family: 4K Porn, CrazyPorn, Love4Porn, Hoes
- Trendio family: TheyAreHuge, Tranny One, AH-ME, AShemale, BDSM One, BeMyHole, GayGo, GayXO, Shemale Pub, SunPorno, YesVids
- Standalone adapters: all remaining launch platforms

Family membership must not be assumed to imply identical DOM. Shared rules are accepted only when the fixtures for every consuming adapter pass.

## 8. Adapter contract

The TypeScript contract is conceptually:

```ts
type PageKind =
  | "restricted"
  | "search"
  | "library"
  | "watch"
  | "blocked-listing"
  | "home"
  | "unknown";

interface SiteAdapter {
  id: string;
  displayName: string;
  hostnames: readonly string[];
  ruleVersion: number;
  classify(context: ClassificationContext): PageKind;
  protectedSelectors: Partial<Record<PageKind, readonly string[]>>;
  hideSelectors: Partial<Record<PageKind, readonly Rule[]>>;
  globalRecommendationSelectors: readonly Rule[];
  healthChecks: Partial<Record<PageKind, readonly HealthCheck[]>>;
  disableAutoAdvance?: AutoAdvanceRule;
}
```

Every `Rule` has a stable ID, a CSS selector, and an optional container-resolution strategy such as `self`, `closest(selector)`, or `parent(levels)`. Parent traversal has a fixed adapter-defined maximum and may not be chosen dynamically from arbitrary page content.

Every adapter must:

- Classify search, watch, home, and blocked-listing routes.
- Mark search-result and player roots where they exist.
- Declare precise feed and recommendation rules.
- Declare an auto-advance strategy or explicitly prove through fixtures that the site has none.
- Include health checks for stable page-shell signals.
- Pass the common adapter contract suite.

## 9. Blocking algorithm

### 9.1 Known sites

At `document_start`, the registered content script resolves the adapter from the current hostname and URL. Route-safe CSS for the initial page class is inserted before ordinary page content renders. Search routes never receive broad feed selectors.

When DOM roots become available, the engine:

1. Registers protected search, player, and account/library roots.
2. Evaluates exact adapter rules.
3. Rejects any match that is a protected root, contains one, or is contained by one unless the rule explicitly targets a separate recommendation descendant.
4. Adds `data-afb-hidden="<adapter-id>:<rule-id>"` to accepted nodes.
5. Hides marked nodes through one extension-owned stylesheet using `display: none !important`, which also removes them from the accessibility tree.
6. Reports an in-memory count for the current tab.

The extension hides rather than deletes nodes. On an SPA route change, it removes all `data-afb-hidden` attributes, clears the protection registry, reclassifies the route, and reapplies the correct rules. This prevents a reused DOM node hidden on a category route from remaining hidden after navigation to search.

### 9.2 Dynamic content

One `MutationObserver` watches `childList` changes across the document subtree. The mutation controller batches work into a single scheduled pass, deduplicates ancestor/descendant additions, and examines only inserted subtrees. A full-document rescan is allowed only after a route change or adapter reinitialization.

Open shadow roots discovered in inserted subtrees may be observed. Closed shadow roots and cross-origin frames outside granted hosts are not inspected. Built-in content scripts run in matching same-origin frames only when the adapter declares frame support.

### 9.3 Generic detector

The generic detector runs only on:

- A user-added hostname, or
- A known site whose adapter health check failed or whose route is `unknown`.

It generates candidates from semantic sections, complementary regions, labeled containers, and repeated card groups. The default score is:

| Signal | Score |
|---|---:|
| Recommendation keyword in heading, `aria-label`, ID, or class token | +4 |
| Blocked-listing route token or heading | +4 |
| At least three distinct video-like links adjacent to or below a primary player | +3 |
| Repeated card signature with at least four items | +2 |
| `aside` or `role="complementary"` near a player | +2 |
| Contains or ancestors a protected player/search root | Reject |
| Inside a search-result root | Reject |
| Inside account, legal, age, or checkout UI | Reject |

A candidate is hidden at a score of 6 or higher. The lexicon covers English, German, French, Spanish, Italian, Dutch, and Portuguese equivalents of related, recommended, similar, popular, trending, recent, featured, and up next. The lexicon contains interface terms only; it does not inspect titles or infer sexual content.

On a generic `search` page, repeated-card and proximity signals alone may not hide anything. Only an explicitly labeled recommendation module outside the protected results root can pass the threshold.

### 9.4 Auto-advance

Auto-advance is independent of visual feed blocking. A known adapter may:

- Turn off a confirmed site autoplay-next control,
- Cancel a confirmed countdown through packaged adapter code,
- Remove a next-video URL from a confirmed player configuration through a packaged main-world hook, or
- Stop a confirmed next-video action when the current media element emits `ended`.

The hook may not disable playback of the selected video, intercept arbitrary navigation, or fetch remote code. Generic sites disable auto-advance only when a confirmed DOM control is present; otherwise they leave it unchanged and report no unsupported claim.

## 10. Route detection

The isolated content script listens for `popstate` and `hashchange`. The packaged route bridge wraps `history.pushState` and `history.replaceState` only long enough to call the original function and dispatch a namespaced route-change event. It does not inspect state objects or arguments.

The blocker compares the complete `location.href` in memory to its last value but never persists or transmits it. Reclassification is idempotent and debounced.

## 11. Permissions

Required manifest permissions:

- `storage`
- `scripting`
- `activeTab`

Persistent host permissions contain only the 50 primary hostnames, their `www` forms, and the four explicit `.tube` aliases. The manifest declares `http://*/*` and `https://*/*` under `optional_host_permissions`, which is required for requesting an arbitrary user-chosen web origin later. These patterns are not granted at installation. After the user clicks **Block recommendations on this site**, the runtime request contains only the current exact scheme and hostname. The extension never requests a blanket `<all_urls>` grant and does not request `tabs`, `history`, `cookies`, `webRequest`, or `declarativeNetRequest`.

Opening the extension action supplies temporary current-tab access through `activeTab`. The popup asks the service worker to request the current origin. Permission requests occur only inside the click gesture required by Chrome.

## 12. Custom-site lifecycle

### 12.1 Add

1. The popup verifies that the current URL uses `http` or `https` and is not a browser/extension store page.
2. It normalizes the exact hostname to lowercase ASCII and rejects credentials, nonstandard wildcard input, and malformed URLs.
3. It requests only the current scheme and exact hostname.
4. If granted, it stores the hostname and scheme in `chrome.storage.local`.
5. The service worker registers a persistent `document_start` generic content script for that origin.
6. The current tab is injected immediately and reloaded only if Chrome cannot inject into the already loaded document.

Custom permissions are exact-host permissions. Adding `www.example.com` does not grant sibling subdomains or `example.com`; the user can add those separately.

### 12.2 Remove

The Settings page is the only extension UI that removes a custom hostname. Removal:

1. Unregisters the corresponding dynamic content script.
2. Deletes the custom-site record.
3. Calls `chrome.permissions.remove` for the exact origin.
4. Clears in-memory status associated with matching tabs.

The current page returns to its normal state after reload. The popup does not expose this operation.

### 12.3 Startup reconciliation

Because Manifest V3 service workers are suspended, dynamic script registrations and local storage are the durable sources of truth. At install, update, browser startup, and Settings changes, the service worker reconciles registrations against built-in coverage plus stored custom origins. Reconciliation is idempotent.

## 13. Local storage and messages

The persisted schema is:

```ts
interface StoredStateV1 {
  schemaVersion: 1;
  customSites: Array<{
    scheme: "http" | "https";
    hostname: string;
    addedAt: number;
  }>;
}
```

`addedAt` supports deterministic display ordering and is not browsing history. No per-page counts or page metadata are persisted.

Content-script status is tab-local and ephemeral:

```ts
interface PageStatus {
  state:
    | "active-known"
    | "active-generic"
    | "needs-update"
    | "unsupported"
    | "restricted"
    | "permission-denied";
  adapterId?: string;
  pageKind?: PageKind;
  blockedCount: number;
  autoAdvanceBlocked: boolean;
}
```

Messages use a versioned discriminated union and accept no executable strings. The popup queries the current content script for status; counts disappear with the tab.

## 14. User interface

### 14.1 Popup

The popup has these states:

- **Protected** — known adapter active, with the current blocked count.
- **Protected with generic rules** — custom or fallback detector active, with the current blocked count.
- **Protection may need an update** — adapter health check or rule execution failed; generic fallback may still report a count.
- **Not yet protected** — eligible page with **Block recommendations on this site** as the primary action.
- **Permission not granted** — request was declined; the page is unchanged and the add action remains available.
- **Unavailable on this page** — Chrome internal, extension store, non-HTTP(S), or other restricted page.

Every state includes an **Open Settings** link. Protected states contain no reveal, pause, or disable button. The popup never displays page titles, search terms, video titles, or stored viewing information.

### 14.2 Settings

The Settings page contains:

1. A read-only, searchable list of the 50 built-in platforms and aliases.
2. A custom-sites list showing only scheme and hostname, ordered by `addedAt`.
3. A Remove action for each custom hostname.
4. A privacy explanation stating what is stored and that the extension makes no extension-owned network requests.
5. The installed extension version and packaged adapter-rule version.

There is no bulk disable, recommendation reveal, custom-selector editor, or cloud sync.

### 14.3 Accessibility

Popup and Settings controls are keyboard operable, use native buttons and links, expose visible focus, meet WCAG AA contrast, and announce asynchronous permission results through an `aria-live` region. Hidden recommendation nodes are removed from both visual layout and the accessibility tree.

## 15. Failure handling

### 15.1 Selector and adapter failures

Each rule executes independently inside an adapter-scoped boundary. An invalid selector, failed hook, or unexpected DOM structure records an in-memory adapter error, skips that rule, and continues processing other rules. Errors never propagate into the host page.

Zero matches alone does not imply failure. **Protection may need an update** appears only when:

- A stable adapter health check fails on a recognized page class,
- A selector or hook throws,
- The page shell matches but all required protection roots are missing, or
- The adapter declares auto-advance support and its required control/configuration cannot be reached.

When safe, the generic detector runs as fallback while status remains degraded.

### 15.2 Search and player safety

Protected roots have absolute precedence. If a candidate contains the search-results root or selected player, it is rejected. On ambiguity, the engine preserves content. Known adapter fixtures, rather than generic confidence, carry the strict coverage requirement.

### 15.3 Performance protection

- Mutation work is batched and debounced.
- Inserted ancestors subsume their inserted descendants in the same batch.
- Candidate enumeration has per-pass limits.
- A long task aborts the current generic scan and schedules remaining work for a later idle period.
- Full-document scans occur only on initial load, route change, or explicit reinitialization.
- The observer disconnects during extension-owned attribute cleanup to avoid feedback loops.

### 15.4 Permission failure

If an optional permission is denied or revoked, no script registration remains for that origin. Stored state is reconciled to the actual permission set. The popup explains the local state without retry loops or background prompts.

## 16. Privacy and security requirements

- Use `chrome.storage.local`, never `chrome.storage.sync`.
- Persist no complete URL, path, query string, title, search term, media identifier, or browsing event.
- Make no extension-owned HTTP, analytics, error-reporting, or update-check requests.
- Package all executable code; do not use `eval`, `new Function`, remote scripts, or remotely interpreted rule logic.
- Use no cookie, history, request interception, clipboard, download, identity, or notification permission.
- Treat stored custom hostnames as sensitive local configuration.
- Sanitize all fixture content and store no thumbnails, videos, titles, usernames, or queries from live adult sites.
- Keep main-world code minimal, packaged, deterministic, and free of data extraction.
- Render all popup and Settings values as text, never injected HTML.
- Validate adapter selectors at build time where possible and catch runtime selector errors.
- Include no explicit imagery or explicit sample copy in the extension package or store listing assets.

## 17. Testing strategy

### 17.1 Adapter fixtures

Every adapter has at least four sanitized HTML fixtures:

1. Home/discovery page
2. Category, tag, or performer listing
3. Watch page with recommendation surfaces
4. Search-results page

Adapters with distinct library, SPA, end-screen, or autoplay-next behavior include additional fixtures. Sanitization replaces imagery, video sources, titles, usernames, and queries while retaining structural markup, relevant attributes, and class names.

The baseline is therefore at least 200 adapter fixtures.

### 17.2 Unit tests

Unit coverage includes:

- Hostname-to-adapter resolution and explicit aliases
- Page-class precedence and route parsing
- Protected-root rejection
- Rule container resolution and traversal limits
- Hide/restore idempotency
- SPA reclassification
- Mutation batching and deduplication
- Generic scoring, threshold, and protected-context rejection
- Storage migration and validation
- Permission add/remove/reconcile flows
- Versioned message validation
- Status-state derivation

### 17.3 Adapter contract tests

For every launch adapter:

- Home and blocked-listing feeds are hidden.
- Search form, filters, pagination, and results remain visible.
- The selected player and essential controls remain visible.
- Related, suggested, and end-screen modules are hidden.
- Auto-advance is prevented when the site provides it.
- Late inserted cards are hidden.
- Route changes restore and reapply the correct state.
- Invalid optional selectors cannot crash the engine.
- Health checks distinguish a valid empty page from a broken adapter.

### 17.4 Browser extension tests

Chromium end-to-end tests load the unpacked production build and use a local fixture server. They cover:

- Static `document_start` protection
- Popup states and blocked count
- Add-site permission approval and denial
- Generic script registration and immediate activation
- Settings removal, registration removal, and permission revocation
- Service-worker suspension followed by reconciliation
- Multi-tab isolation
- Same-origin frame handling where declared
- Keyboard and screen-reader semantics for popup and Settings
- Absence of extension-owned network requests

### 17.5 Manual release smoke tests

Before release, each of the 50 adapters is checked against the legally accessible public version of its site. Testing does not bypass authentication, age assurance, geographic restrictions, or access controls. If a site cannot legally or technically be reached from the test environment, its sanitized fixture suite remains mandatory and the release notes disclose that live verification was unavailable for that version.

No explicit screenshots or media are committed.

## 18. Acceptance gates

A version 1 release candidate is acceptable only when:

1. All 50 adapter contract suites pass.
2. At least 200 sanitized baseline fixtures pass.
3. The fixture corpus contains zero hidden search-result roots and zero hidden selected-player roots.
4. All supported auto-advance fixtures stop transition to another video.
5. The generic detector reaches at least 95% container-level precision on a separate labeled mixed-page fixture corpus.
6. Initial processing completes in under 50 ms at the 95th percentile on the reference desktop fixture containing 1,000 video cards.
7. A mutation batch of 100 inserted cards completes without a full-document rescan and without a browser long task over 50 ms.
8. Add/remove/reconcile permission tests pass after simulated service-worker suspension.
9. The production build makes zero extension-owned network requests during the end-to-end suite.
10. The production manifest contains none of the prohibited permissions listed in this document.
11. Keyboard navigation and automated accessibility checks pass for popup and Settings.
12. The packaged artifact contains no explicit images, video, titles, usernames, or search terms.

The 95% generic precision gate measures precision, not recall. Generic recall is best-effort in version 1; dedicated adapters provide the launch guarantee.

## 19. Build and release constraints

- TypeScript is required for extension code and adapter definitions.
- The UI uses native HTML, CSS, and TypeScript without a frontend framework.
- The extension targets the current stable Chrome Manifest V3 platform.
- Builds are reproducible from a locked dependency graph.
- CI runs type checking, linting, unit tests, adapter contract tests, extension end-to-end tests, performance assertions, manifest inspection, and package-content inspection.
- Adapter and storage schemas carry explicit versions.
- Built-in rule updates ship through normal Chrome extension releases only.
- Release notes identify adapters added, repaired, or live-verified without describing user browsing activity.

## 20. Maintenance model

Adapter health is maintained through fixtures and issue reports rather than telemetry. A selector repair updates the smallest site or family module possible and adds a fixture reproducing the breakage. Family-rule changes must run the full contract suite for every family member.

An adapter is never silently removed. If a site closes, changes category, or becomes inaccessible across the supported market, the next release may mark it retired and remove its host permission; that is a separately reviewed product change.

## 21. Key risks and mitigations

| Risk | Mitigation |
|---|---|
| Frequent DOM changes across 50 sites | Adapter isolation, family reuse, health checks, and per-site fixtures |
| Search results accidentally hidden | Page-class precedence, protected roots, conservative search behavior, zero-false-positive release gate |
| Broad permission warning reduces trust | Explicit persistent host list, ungranted optional HTTP(S) capability, exact-origin runtime requests, and plain-language privacy copy |
| Dynamic recommendations reappear | `document_start` rules, route bridge, and subtree-scoped mutation processing |
| SPA navigation leaves stale hidden state | Attribute-based hiding followed by restore/reclassify/reapply |
| Generic detector hides legitimate content | High threshold, protected contexts, 95% precision gate, best-effort positioning |
| Site auto-advance mechanisms differ | Explicit adapter hook contract and per-site auto-advance fixtures |
| Service worker suspension loses state | Persistent script registrations plus idempotent reconciliation |
| Adult material enters the repository | Sanitized fixtures and package-content inspection |
| Regional age/access law changes | No bypass behavior; fixture fallback and transparent live-verification notes |

## 22. Delivery boundary

This specification defines one version 1 product: a Chrome extension with 50 dedicated adapters, strict feed removal, preserved search/direct viewing, custom-host generic protection, local-only state, popup/Settings UI, and the test/release system required to maintain it.

Expanding to general algorithmic feeds, adding other browsers, building remote rule distribution, or introducing content classification requires a new design cycle.

## 23. References

- Chrome extension permissions: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome remote-hosted-code policy: https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
- Ofcom adult-service enforcement program: https://www.ofcom.org.uk/online-safety/protecting-children/enforcement-programme-to-protect-children-from-encountering-pornographic-content-through-the-use-of-age-assurance
- Ofcom AVS Group confirmation decision: https://www.ofcom.org.uk/siteassets/resources/documents/about-ofcom/bulletins/enforcement-bulletin/avs-group-ltd/avs-group-ltd-final-confirmation-decision.pdf
- Public adult-domain dataset considered for background research, not bundled in version 1: https://github.com/Bon-Appetit/porn-domains
