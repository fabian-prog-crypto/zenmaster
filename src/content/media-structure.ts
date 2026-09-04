export interface MediaCardGroup {
  container: Element;
  cards: readonly Element[];
}

const VIDEO_PATH = /(?:\/view_video\.php|\/videos?(?:\/|$)|\/watch(?:\/|$)|\/v\/)/i;
const THUMBNAIL = "img, picture, video[poster], [class*='thumb' i], [data-thumbnail]";
const CARD =
  "article, li, [class*='card' i], [class*='item' i], [class*='entry' i], [class*='thumb' i], [data-video-id]";
const CANDIDATE =
  "section, aside, [role='complementary'], [class], [id], [data-layout], [data-testid]";
const EXCLUDED = "nav, header, footer, form, [role='navigation']";
const MAX_CANDIDATES = 500;
const MAX_ANCHORS_PER_CANDIDATE = 80;

export function isLikelyMediaAnchor(anchor: HTMLAnchorElement): boolean {
  try {
    const path = new URL(anchor.href, anchor.ownerDocument.baseURI).pathname;
    return VIDEO_PATH.test(path) || anchor.querySelector(THUMBNAIL) !== null;
  } catch {
    return false;
  }
}

export function findMediaCardGroups(
  root: Document | Element | ShadowRoot
): readonly MediaCardGroup[] {
  const candidates = new Set<Element>();
  if (root instanceof Element && root.matches(CANDIDATE)) candidates.add(root);
  for (const candidate of root.querySelectorAll(CANDIDATE)) {
    if (candidates.size >= MAX_CANDIDATES) break;
    candidates.add(candidate);
  }

  const groups: MediaCardGroup[] = [];
  for (const candidate of candidates) {
    if (isExcluded(candidate) || isPageShell(candidate)) continue;
    const cards = new Set<Element>();
    const anchors = candidate.querySelectorAll<HTMLAnchorElement>("a[href]");
    for (let index = 0; index < Math.min(anchors.length, MAX_ANCHORS_PER_CANDIDATE); index += 1) {
      const anchor = anchors[index]!;
      if (!isLikelyMediaAnchor(anchor)) continue;
      const card = cardWithinCandidate(anchor, candidate);
      if (card) cards.add(card);
    }
    if (cards.size >= 3) groups.push({ container: candidate, cards: [...cards] });
  }
  return preferSmallestCompleteGroups(groups);
}

function isExcluded(candidate: Element): boolean {
  return candidate.matches(EXCLUDED) || candidate.closest(EXCLUDED) !== null;
}

function isPageShell(candidate: Element): boolean {
  return (
    candidate.matches("html, body, main, [role='main']") ||
    candidate.querySelector("main, [role='main']") !== null
  );
}

function cardWithinCandidate(anchor: HTMLAnchorElement, candidate: Element): Element | null {
  const closest = anchor.closest(CARD);
  if (closest && closest !== candidate && candidate.contains(closest)) return closest;

  let directChild: Element = anchor;
  while (directChild.parentElement && directChild.parentElement !== candidate) {
    directChild = directChild.parentElement;
  }
  return directChild === candidate ? null : directChild;
}

function preferSmallestCompleteGroups(groups: readonly MediaCardGroup[]): MediaCardGroup[] {
  return groups.filter(
    (group) =>
      !groups.some(
        (other) =>
          other !== group &&
          group.container.contains(other.container) &&
          other.cards.length >= group.cards.length
      )
  );
}
