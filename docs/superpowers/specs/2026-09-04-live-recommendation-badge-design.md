# Zen Master Live Recommendation Badge — Design

**Status:** Approved in conversation

**Date:** 2026-09-04

## Summary

Zen Master will show a per-tab toolbar badge containing the number of individual recommendation video thumbnails currently hidden on the active page. The badge supplements the popup status; it does not introduce a pause, reveal, or disable control.

The count is ephemeral. It is computed from the current DOM, sent only between the content script and the extension service worker, and never stored or transmitted.

## User-visible behavior

- The badge appears on the 🧘 toolbar icon.
- It shows the current page's number of hidden recommendation thumbnails.
- Counts from 1 through 99 are displayed directly; larger counts display `99+`.
- A zero count displays no badge text.
- The popup displays the exact individual-thumbnail count even when the toolbar badge is capped.
- Counts reset during navigation and are recomputed after initial load, dynamic DOM insertion, and single-page-app route changes.
- Unsupported and restricted pages have no badge.
- Search results and the deliberately selected player never contribute to the count.

## Counting model

The unit is one unique recommendation card element in the current document, not a recommendation container and not a link.

For each DOM root already hidden by Zen Master:

1. Use adapter-supplied recommendation-card selectors when the adapter provides them.
2. Otherwise, inspect only descendants of the hidden root for conservative card structures containing a likely video link.
3. Deduplicate by DOM element identity so a thumbnail with multiple links counts once.
4. If the hidden root is itself a card and no descendant card is found, count it once.
5. Ignore disconnected nodes and anything intersecting a protected search, player, or library root.

The fallback never scans the full page. It runs only inside elements Zen Master has already decided to hide, so counting cannot expand the blocking scope.

## Architecture and data flow

`SiteAdapter` gains an optional immutable `recommendationCardSelectors` list. Family defaults cover common list-item and video-card markup, while a site adapter may extend them for precise live-site markup.

`Blocker` exposes its currently connected owned hidden roots without exposing page content. A focused recommendation counter receives those roots and the adapter's selectors, returning an integer.

`ContentKernel` adds `blockedVideoCount` to `PageStatus` and publishes status after:

- initial classification and blocking;
- mutation batches that change hidden roots;
- SPA route reinitialization.

The production bootstrap sends a versioned `SET_TAB_BADGE` message containing only the non-negative integer count. The service worker accepts this message only from an extension content script with a real sender tab, formats the badge as blank, `1`–`99`, or `99+`, and calls `chrome.action.setBadgeText` for that tab. It also sets a fixed high-contrast badge background color.

The service worker clears the badge when a tab starts navigating so a count from the previous document cannot linger while the next page loads. Closing a tab naturally discards its tab-scoped badge.

## Privacy and failure behavior

- No URLs, titles, thumbnail text, media identifiers, or DOM content cross the content-script boundary.
- Counts are not written to `chrome.storage`.
- No new permissions or network capabilities are added.
- Invalid, negative, fractional, or unreasonably large message counts are rejected.
- Badge API failures do not interrupt page blocking.
- If card recognition is uncertain, Zen Master undercounts rather than counting arbitrary links.

## Verification

Automated tests will cover:

- a Pornhub right rail containing two cards produces `blockedVideoCount: 2` while preserving the player;
- duplicate links inside one card count once;
- disconnected hidden roots stop contributing;
- mutations and route changes replace the current count rather than accumulating it;
- badge formatting for 0, 1, 99, 100, and invalid values;
- navigation clearing and sender validation;
- popup wording uses individual video recommendations;
- the full permissions, privacy, performance, package, and extension-browser gates remain green.
