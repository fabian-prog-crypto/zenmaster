import type { CatalogEntry, Rule } from "../types.js";

const commonFeedSelectors = [
  ".video-grid",
  ".videos-grid",
  ".video-list",
  ".videos-list",
  ".list-videos",
  ".thumbs",
  ".thumb-list",
  "[data-video-list]",
  "[data-testid*='video-list' i]",
  "[class*='infinite-scroll' i]"
];

const familyFeedSelectors: Record<CatalogEntry["family"], readonly string[]> = {
  aylo: [".videos", ".video-wrapper", ".pcVideoListItem"],
  wgcz: [".mozaique", ".thumb-block", ".thumb-inside"],
  avs: [".list-videos-v2", ".margin-fix", ".thumbs-items"],
  "8579": [".thumbs-items", ".thumbs-list", ".content-list"],
  trendio: [".videos", ".videos-row", ".thumbs-list"],
  standalone: [".results", ".items", ".content-list"]
};

const recommendations = [
  "[id*='related' i]",
  "[class*='related-videos' i]",
  "[class*='recommended-videos' i]",
  "[class*='recommendations' i]",
  "[data-testid*='recommend' i]",
  "[aria-label*='related' i]",
  "[aria-label*='recommended' i]",
  "[aria-label*='empfohlen' i]",
  "[aria-label*='recommand' i]",
  "[aria-label*='recomend' i]",
  "[aria-label*='consigliat' i]",
  "[class*='similar-videos' i]",
  "[class*='up-next' i]",
  "[class*='next-video' i]",
  "[class*='end-screen' i]",
  "[class*='endscreen' i]"
];

const siteRecommendationSelectors: Partial<Record<string, readonly string[]>> = {
  pornhub: [
    "#relatedVideosCenter",
    ".recommended-video-wrapper",
    "[data-testid='video-recommendations']"
  ],
  xvideos: ["#related-videos", ".video-related"],
  xnxx: ["#related-videos", ".video-related"],
  xhamster: ["[data-role='related-videos']", ".related-container"],
  spankbang: [".similar_videos", "#video_related"],
  eporner: ["#relateddiv", ".relatedbox"],
  motherless: ["#content-related", ".media-related"]
};

export function feedRulesFor(entry: CatalogEntry, namespace: "home" | "listing"): Rule[] {
  const selectors = [...commonFeedSelectors, ...familyFeedSelectors[entry.family]];
  return unique(selectors).map((selector, index) => ({
    id: `${namespace}-feed-${index + 1}`,
    selector,
    container: { type: "self" }
  }));
}

export function recommendationRulesFor(entry: CatalogEntry): Rule[] {
  return unique([...recommendations, ...(siteRecommendationSelectors[entry.id] ?? [])]).map(
    (selector, index) => ({
      id: `recommendation-${index + 1}`,
      selector,
      container: { type: "self" }
    })
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
