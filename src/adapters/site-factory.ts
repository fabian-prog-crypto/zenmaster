import catalogJson from "./catalog.json" with { type: "json" };
import { defineAdapter } from "./define-adapter.js";
import {
  feedRulesFor,
  recommendationCardSelectorsFor,
  recommendationRulesFor
} from "./families/profiles.js";
import type { CatalogEntry, ClassificationContext, SiteAdapter } from "./types.js";

const catalog = catalogJson as readonly CatalogEntry[];
const RESTRICTED =
  /\/(?:login|sign[-_]?in|checkout|billing|privacy|legal|terms|age[-_]?verif|access[-_]?denied)(?:\/|$)/i;
const LIBRARY = /\/(?:history|favorites?|favourites?|saved|subscriptions?|playlists?)(?:\/|$)/i;
const WATCH = /\/(?:watch|video|videos|view|embed)(?:\/|$)/i;
const LISTING =
  /\/(?:categor(?:y|ies)|tags?|performers?|models?|studios?|channels?|popular|trending|recent|best|featured)(?:\/|$)/i;

export function createCatalogAdapter(id: string): SiteAdapter {
  const entry = catalog.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Unknown catalog adapter: ${id}`);
  const homeFeeds = feedRulesFor(entry, "home");
  const listingFeeds = feedRulesFor(entry, "listing");
  return defineAdapter({
    id: entry.id,
    displayName: entry.displayName,
    domainRoots: entry.domainRoots,
    ruleVersion: 1,
    frameSupport: "top-only",
    classify: classifyKnownPage,
    protectedSelectors: {
      search: [
        "form[role='search']",
        "form[action*='search' i]",
        "input[type='search']",
        ".search-results",
        "[id*='search-results' i]",
        "[class*='search-results' i]"
      ],
      library: ["main", "[role='main']", "[class*='library' i]", "[class*='favorites' i]"],
      watch: [
        "video",
        "#player",
        "[data-player]",
        ".video-player",
        "[class*='player-container' i]",
        "[id*='video-player' i]"
      ]
    },
    hideSelectors: {
      home: homeFeeds,
      "blocked-listing": listingFeeds
    },
    globalRecommendationSelectors: recommendationRulesFor(entry),
    recommendationCardSelectors: recommendationCardSelectorsFor(entry),
    healthChecks: {
      home: [{ id: "document-body", selector: "body", required: true }],
      search: [{ id: "document-body", selector: "body", required: true }],
      library: [{ id: "document-body", selector: "body", required: true }],
      watch: [{ id: "document-body", selector: "body", required: true }],
      "blocked-listing": [{ id: "document-body", selector: "body", required: true }]
    },
    disableAutoAdvance: {
      type: "toggle-off",
      selector:
        "[aria-label*='autoplay' i][aria-checked='true'], [data-role='autoplay-next'][aria-checked='true'], .autoplay-next[aria-checked='true']",
      stateAttribute: "aria-checked",
      onValue: "true"
    }
  });
}

function classifyKnownPage(context: ClassificationContext) {
  if (RESTRICTED.test(context.path)) return "restricted" as const;
  if (
    /\/(?:search|find|results?)(?:\/|$)/i.test(context.path) ||
    ["q", "query", "search", "search_query", "k"].some((key) => context.queryKeys.has(key))
  )
    return "search" as const;
  if (LIBRARY.test(context.path)) return "library" as const;
  if (WATCH.test(context.path) || context.has("video, [data-player], .video-player"))
    return "watch" as const;
  if (LISTING.test(context.path)) return "blocked-listing" as const;
  if (context.path === "/" || context.path === "") return "home" as const;
  return "unknown" as const;
}
