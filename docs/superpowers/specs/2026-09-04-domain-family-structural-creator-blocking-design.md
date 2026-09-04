# Zen Master — Domain Families, Structural Blocking, and Creator Paths

**Status:** Approved in conversation; awaiting written-spec review

**Date:** 2026-09-04

**Target release:** Zen Master 0.1.4

**Relationship to prior specifications:** This document extends the approved version 1 product design. Where the earlier design limits built-in coverage to exact hostnames or limits generic detection to unknown/degraded pages, this document supersedes those rules with bounded domain-root wildcards and structural detection on every supported adapter. The live recommendation badge design remains unchanged except that structurally hidden cards also contribute to its count.

## 1. Summary

Zen Master 0.1.4 replaces exact-host-only coverage with verified domain families and runs conservative structural recommendation detection alongside every dedicated adapter. This fixes regional hosts such as `ge.xhamster.desi`, prevents sites such as NoodleMagazine from escaping protection merely because their live class names differ from fixtures, and closes the uploader-to-profile discovery path on video pages.

The release preserves the product's existing intent boundary: genuine search results, a deliberately selected video and its essential controls, and user-owned history, favorites, saved videos, and playlists remain available. Zen Master continues to provide no pause, reveal, or per-site disable control.

## 2. Goals

1. Activate each built-in adapter on the verified base domain and every subdomain beneath it.
2. Hide recommendation feeds that do not match known site-specific selectors.
3. Keep search-result grids, the selected player, and user-owned libraries visible.
4. Hide uploader identity and creator-driven continuation paths on watch pages.
5. Hide discovery feeds on creator, performer, model, studio, and channel pages.
6. Continue blocking recommendation content inserted after load or after an SPA route change.
7. Count structurally detected recommendation cards in the existing toolbar badge.
8. Avoid blanket access to unrelated websites and avoid hostname-substring matching.

## 3. Non-goals

This release does not:

- Request `<all_urls>` or run on every website.
- Guess that a lookalike hostname belongs to a supported platform because it contains a brand name.
- Discover every alternate registrable domain automatically.
- Analyze thumbnail pixels, video, audio, titles, usernames, or sexual-content semantics.
- Block direct video URLs, genuine query-result pages, or user-owned library pages.
- Bypass Cloudflare, authentication, age assurance, paywalls, or geographic restrictions during site auditing.
- Add a pause, reveal, allowlist, or per-site disable control.
- Replace a protected page with a blank document.

## 4. Terminology

A **domain root** is an explicitly verified registrable hostname controlled by a supported platform, such as `xhamster.desi`. A domain root includes itself and any hostname ending at a label boundary with `.<domain-root>`.

A **domain family** is the set of domain roots assigned to one adapter. For example, the xHamster adapter initially owns `xhamster.com` and `xhamster.desi`.

A **structural recommendation region** is a DOM container recognized by repeated video-card structure, recommendation interface labels, or placement near a selected player without relying on one exact site CSS class.

A **creator path** is a UI route from a selected video to an uploader, creator, performer, model, studio, or channel page and from that page into another discovery feed.

## 5. Domain-family coverage

### 5.1 Catalog model

Each catalog entry gains an immutable `domainRoots` list. The primary hostname must be one of its roots. Existing alternate registrable domains move into the same list.

The initial additions required by reported failures are:

- Pornhub: `pornhub.com`, `pornhub.org`
- xHamster: `xhamster.com`, `xhamster.desi`

Existing alternate roots such as `txxx.tube`, `hdzog.tube`, `thegay.tube`, and `shemalez.tube` remain associated with their existing adapters. The former exact alias `de.pornhub.org` becomes the root `pornhub.org`, covering that hostname and other regional subdomains.

Every primary hostname in the 50-site catalog is treated as a domain root unless the catalog explicitly says otherwise. Alternate registrable domains remain explicit data; Zen Master does not infer them from branding.

### 5.2 Chrome registration patterns

For every verified domain root, the build emits one HTTPS pattern:

```text
https://*.<domain-root>/*
```

Chrome match patterns define this form as matching the domain root and all of its subdomains. Therefore `https://*.xhamster.desi/*` covers both `xhamster.desi` and `ge.xhamster.desi`.

The build deduplicates roots within one adapter and fails if roots owned by different adapters are equal or nested. Custom sites continue to use the exact origin granted by the user; adding a custom site does not silently grant all of its subdomains.

### 5.3 Runtime resolution

The adapter registry normalizes hostnames to lowercase, removes a trailing dot, and matches only:

- `hostname === domainRoot`, or
- `hostname.endsWith("." + domainRoot)`.

The registry must never use substring matching. `fake-xhamster.desi.example` and `xhamster.desi.example` do not match the xHamster adapter. Within one adapter, redundant nested roots are rejected by catalog validation rather than relying on resolution order.

The popup's built-in-site test uses the same resolver so a supported regional subdomain is shown as already protected rather than offered as a custom site.

## 6. Blocking pipeline

### 6.1 Ordered layers

On every recognized page, Zen Master processes content in this order:

1. Classify the route.
2. Register protected roots for search, library, and the selected player.
3. Apply exact adapter and family selectors.
4. Run the structural detector in the policy allowed for that page class.
5. Apply creator-path rules when the page is a watch or creator route.
6. Disable confirmed auto-advance controls.
7. Count individual hidden recommendation cards and publish status.

Exact rules remain the fast, deterministic first layer. Structural detection is no longer restricted to unknown or degraded adapters; a healthy known adapter can still encounter newly renamed recommendation markup.

### 6.2 Page-class policy

| Page class        | Structural behavior                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `restricted`      | Do nothing.                                                                                                                                                           |
| `search`          | Protect the search form, filters, pagination, and complete results root. Hide only a separate, high-confidence recommendation region outside it.                      |
| `library`         | Protect user-owned lists. Hide only a separate, high-confidence recommendation region outside them.                                                                   |
| `watch`           | Protect the selected player and essential controls. Hide recommendation grids, sidebars, carousels, end screens, creator continuation modules, and uploader identity. |
| `blocked-listing` | Hide the discovery grid and creator/listing feed while preserving navigation needed to reach search.                                                                  |
| `home`            | Hide passive video grids and feed sections while preserving site navigation and search.                                                                               |
| `unknown`         | Preserve ambiguous content and hide only high-confidence recommendation regions.                                                                                      |

Protection always wins. A candidate that contains or intersects a protected search-results root, selected player, or user-owned library root is rejected.

### 6.3 Structural signals

The detector scores containers rather than individual arbitrary links. It uses interface structure only:

- Recommendation labels in headings, IDs, classes, roles, or accessible labels.
- Three or more repeated card-like children containing a likely media link and a thumbnail signal such as `img`, `picture`, a poster-bearing media element, or a thumbnail class/attribute.
- Several media links in an `aside`, complementary region, carousel, grid, or list adjacent to or below the selected player.
- Repeated duration badges, play affordances, or card metadata structures when combined with repeated thumbnail links.
- Home or blocked-listing page context.
- “More from,” uploader, creator, performer, model, studio, or channel interface labels on watch pages.

The detector does not score text inside titles or usernames. It examines a bounded number of candidate containers and children per pass. When nested containers qualify, it hides the smallest container that removes the complete repeated recommendation group without swallowing protected or unrelated page structure.

### 6.4 NoodleMagazine behavior

NoodleMagazine is a required regression target:

- Its homepage recommendation grid is hidden even when no known selector matches.
- Its genuine search-results grid remains visible.
- A watch page preserves the selected player while hiding side, below-player, and dynamically appended recommendations.
- A recommendation card contributes once to the badge even if it contains multiple links.
- Cloudflare or other access-verification pages remain untouched.

The regression fixture is sanitized and structure-focused. It contains no copied titles, usernames, thumbnail images, media URLs, or explicit content.

## 7. Creator-path blocking

### 7.1 Watch pages

On supported watch pages Zen Master hides:

- The uploader or creator name and avatar block.
- Links to uploader, creator, performer, model, studio, and channel profiles.
- Subscribe, follow, and fan controls attached to that identity block.
- Creator popularity and inventory statistics when they are part of the same identity block.
- “More from this creator/account/channel” video rows and creator playlists.

The selected video title, player, playback controls, and neutral video metadata remain visible. If a site places essential playback controls inside the same broad container as uploader metadata, Zen Master hides the narrow creator descendants rather than the broad container.

### 7.2 Creator and channel routes

Routes classified as performer, model, studio, uploader, creator, or channel pages use `blocked-listing` behavior. Their discovery video grid and creator continuation controls are hidden. Zen Master preserves the site's global header and search access and does not replace the entire page with a white screen.

Directly typed or bookmarked creator URLs are therefore reachable at the browser level, but they do not expose a clickable catalog of videos. Zen Master does not create a custom interstitial in this release.

### 7.3 Link neutralization

The primary mechanism is hiding the narrow creator identity module. If a creator link remains inside preserved watch-page metadata, Zen Master makes that anchor non-interactive and removes it from keyboard focus while leaving any essential non-creator text visible. Neutralized links are restored before SPA reclassification just like hidden elements.

Search-result cards remain clickable video results. Creator links embedded inside a protected search-results root are not modified in this release because the protected root has absolute precedence.

## 8. Dynamic pages and state

The existing mutation controller remains subtree-scoped and batched. Inserted content goes through the same protection, exact-rule, structural, and creator-path pipeline. Zen Master never performs an unbounded full-document rescan for each mutation.

On route changes it restores all extension-owned hiding and link-neutralization attributes, clears protection state, reclassifies the page, and reapplies the new policy. Counts describe only currently connected hidden recommendation cards and never accumulate across routes.

No page content, URL, title, username, media ID, or recommendation label is persisted or sent outside the tab. Existing badge messages continue to contain only a non-negative count.

## 9. Failure handling

- Invalid site selectors fail independently and mark the adapter as needing an update without stopping structural protection.
- A detector budget overrun stops the current pass and schedules remaining inserted roots for a later idle pass.
- Ambiguous candidates remain visible; false-positive protection takes priority over maximum recall on search and library pages.
- A missing uploader selector does not allow the blocking engine to hide a broad container containing the player.
- If live verification is blocked by authentication, age assurance, Cloudflare, or geography, Zen Master does not bypass it. Sanitized regression fixtures and user-reported structures remain the verification path.
- Zero hidden items on a known home, blocked-listing, or watch page with repeated video-card structure produces a `needs-update` status rather than silently reporting complete protection.

## 10. Auditing all 50 adapters

The release adds an automated domain and structural coverage audit:

1. Every catalog adapter must declare at least one valid domain root.
2. Every primary root, `www` hostname, and synthetic regional subdomain must resolve to the correct adapter.
3. Apex and subdomain manifest patterns must be present exactly once.
4. Lookalike and suffix-confusion hostnames must resolve to no adapter.
5. Every adapter runs the shared home, watch, search, library, and blocked-listing structural contract.
6. Family and site-specific selectors run before the shared detector.
7. The audit may perform opt-in HTTPS reachability and redirect checks without downloading media or bypassing access controls; live reachability is diagnostic, not a build requirement.

An audit can confirm declared roots and discover redirects from reachable roots, but it cannot prove that no unknown alternate registrable domain exists. Newly verified alternate domains must be added explicitly to the catalog and reviewed as new host access.

## 11. Testing and acceptance criteria

The release is accepted only when automated tests prove:

- `ge.xhamster.desi`, `www.xhamster.desi`, `xhamster.desi`, and an arbitrary deeper subdomain resolve to the xHamster adapter.
- `xhamster.desi.example` and brand-name substring lookalikes do not resolve.
- All 50 primary roots and representative subdomains resolve to their intended adapters.
- Built-in Chrome registrations and packaged host permissions use bounded wildcard root patterns.
- Built-in regional subdomains are not offered as custom sites.
- NoodleMagazine home recommendations are hidden by structure with zero exact-selector assistance.
- NoodleMagazine search results and search controls remain visible.
- NoodleMagazine watch recommendations are hidden and the selected player remains visible.
- Known adapters run structural fallback even when their exact rules and health checks succeed.
- Uploader identity and “more from” modules are hidden on watch pages without hiding the player.
- Creator/channel routes hide their discovery grid without hiding global search access or producing a blank page.
- Dynamically inserted recommendations and creator modules are hidden and counted.
- Link neutralization is keyboard-inaccessible while active and fully restored on route change.
- Badge counts remain per-card, deduplicated, current-page-only, and capped visually at `99+`.
- Existing restricted, search, library, permission, privacy, CSP, package-content, browser, and performance suites remain green.

The extension version is bumped to 0.1.4. The unpacked `dist/` directory and release ZIP are rebuilt only after the entire verification suite passes.

## 12. Delivery boundary

This is one combined release covering domain families, all-subdomain activation, structural recommendation detection on all known adapters, the NoodleMagazine regression, and creator-path blocking. It does not include a general-web feed blocker or a creator-blocking interstitial.
