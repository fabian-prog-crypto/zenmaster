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
const MAX_ANCHORS = 4_000;
const MAX_ANCESTOR_DEPTH = 8;

export function isLikelyMediaAnchor(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href") ?? "";
  return VIDEO_PATH.test(href) || anchor.querySelector(THUMBNAIL) !== null;
}

export function findMediaCardGroups(
  root: Document | Element | ShadowRoot
): readonly MediaCardGroup[] {
  const cardsByCandidate = new Map<Element, Set<Element>>();
  const anchors = root.querySelectorAll<HTMLAnchorElement>("a[href]");
  for (let index = 0; index < Math.min(anchors.length, MAX_ANCHORS); index += 1) {
    const anchor = anchors[index]!;
    if (anchor.closest(EXCLUDED) || !isLikelyMediaAnchor(anchor)) continue;
    const closestCard = anchor.closest(CARD);
    const card = closestCard && rootContains(root, closestCard) ? closestCard : anchor;
    let candidate: Element | null = card;
    for (let depth = 0; candidate && depth < MAX_ANCESTOR_DEPTH; depth += 1) {
      if (
        candidate.matches(CANDIDATE) &&
        !isExcluded(candidate) &&
        !isPageShell(candidate) &&
        (cardsByCandidate.has(candidate) || cardsByCandidate.size < MAX_CANDIDATES)
      ) {
        const cards = cardsByCandidate.get(candidate) ?? new Set<Element>();
        cards.add(card);
        cardsByCandidate.set(candidate, cards);
      }
      if (candidate === root) break;
      candidate = candidate.parentElement;
      if (candidate && !rootContains(root, candidate)) break;
    }
  }
  const groups = [...cardsByCandidate]
    .filter(([, cards]) => cards.size >= 3)
    .map(([container, cards]) => ({ container, cards: [...cards] }));
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

function rootContains(root: Document | Element | ShadowRoot, candidate: Element): boolean {
  return root === candidate || root.contains(candidate);
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
