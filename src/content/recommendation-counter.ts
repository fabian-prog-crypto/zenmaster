const VIDEO_PATH = /(?:\/view_video\.php|\/videos?(?:\/|$)|\/watch(?:\/|$)|\/v\/)/i;

const DEFAULT_CARD_SELECTORS = [
  ".video-card",
  ".video-item",
  ".thumb-block",
  ".thumb",
  "[data-video-id]",
  "[data-testid*='video-card' i]",
  "li",
  "article"
] as const;

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
      const card = selector ? anchor.closest(selector) : null;
      if (!card || (card !== root && !root.contains(card))) continue;
      cards.add(card);
      foundInRoot = true;
    }
    if (!foundInRoot && hasLikelyVideoLink(root)) cards.add(root);
  }
  return cards.size;
}

function hasLikelyVideoLink(root: Element): boolean {
  return [...root.querySelectorAll<HTMLAnchorElement>("a[href]")].some(isLikelyVideoLink);
}

function isLikelyVideoLink(anchor: HTMLAnchorElement): boolean {
  try {
    return VIDEO_PATH.test(new URL(anchor.href, anchor.ownerDocument.baseURI).pathname);
  } catch {
    return false;
  }
}
