import type { PageKind } from "../shared/page-kind.js";
import type { ProtectionRegistry } from "./protection-registry.js";

export const GENERIC_THRESHOLD = 6;
export const GENERIC_WEIGHTS = Object.freeze({
  recommendationLabel: 4,
  blockedListing: 4,
  videoLinksNearPlayer: 3,
  repeatedCards: 2,
  complementaryNearPlayer: 2
});

export interface GenericPageContext {
  pageKind: PageKind;
  primaryPlayer?: Element;
}

export interface CandidateScore {
  candidate: Element;
  score: number;
  rejected: boolean;
  signals: readonly string[];
}

export interface RuleMatch {
  ruleId: "generic-high-confidence";
  candidate: Element;
  score: number;
}

export interface GenericDetectionContext {
  pageKind: PageKind;
  protection: ProtectionRegistry;
  primaryPlayer?: Element;
}

const RECOMMENDATION_TERMS = [
  "related",
  "recommended",
  "recommendations",
  "similar",
  "popular",
  "trending",
  "recent",
  "featured",
  "up next",
  "more like",
  "you may also like",
  "empfohlen",
  "ähnlich",
  "beliebt",
  "tendance",
  "recommandé",
  "similaire",
  "populaire",
  "recomendado",
  "similares",
  "popular",
  "consigliati",
  "simili",
  "popolari",
  "aanbevolen",
  "vergelijkbaar",
  "populair",
  "recomendado",
  "semelhante",
  "populares"
];
const LISTING_TERMS = [
  "category",
  "categories",
  "tag",
  "performer",
  "model",
  "studio",
  "channel",
  "popular",
  "trending",
  "recent",
  "best",
  "featured"
];
const LIBRARY_TERMS = ["history", "favorites", "favourites", "saved", "subscriptions", "playlist"];
const RESTRICTED_TERMS = [
  "login",
  "signin",
  "sign-in",
  "checkout",
  "billing",
  "privacy",
  "legal",
  "terms",
  "age",
  "verify",
  "denied",
  "blocked"
];

export function classifyGenericPage(url: URL, page: Document): GenericPageContext {
  const pathTokens = `${url.pathname} ${[...url.searchParams.keys()].join(" ")}`.toLowerCase();
  if (RESTRICTED_TERMS.some((term) => pathTokens.includes(term))) return { pageKind: "restricted" };
  if (LIBRARY_TERMS.some((term) => pathTokens.includes(term))) return { pageKind: "library" };

  const searchSignals =
    Number(/search|results|\bq\b|query/.test(pathTokens)) +
    Number(
      page.querySelector('form[role="search"], form[action*="search" i], input[type="search"]') !==
        null
    ) +
    Number(
      page.querySelector(
        '[id*="search-results" i], [class*="search-results" i], main[aria-label*="search" i]'
      ) !== null
    );
  if (searchSignals >= 2) return { pageKind: "search" };

  const player = page.querySelector(
    "video, [data-player], [class*='video-player' i], [id*='player' i]"
  );
  const watchSignals =
    Number(/watch|video|view|embed/.test(url.pathname.toLowerCase())) + Number(player !== null);
  if (watchSignals >= 2 && player) return { pageKind: "watch", primaryPlayer: player };

  if (url.pathname === "/" || url.pathname === "") return { pageKind: "home" };
  if (LISTING_TERMS.some((term) => pathTokens.includes(term)))
    return { pageKind: "blocked-listing" };
  return { pageKind: "unknown" };
}

export function registerGenericProtectedRoots(
  page: Document,
  context: GenericPageContext,
  protection: ProtectionRegistry
): void {
  if (context.pageKind === "search") {
    for (const element of page.querySelectorAll(
      'form[role="search"], form[action*="search" i], input[type="search"], [id*="search-results" i], [class*="search-results" i], main[aria-label*="search" i]'
    ))
      protection.register(element);
  }
  if (context.pageKind === "library") {
    for (const element of page.querySelectorAll(
      "main, [role='main'], [class*='library' i], [class*='favorites' i]"
    ))
      protection.register(element);
  }
  if (context.primaryPlayer) {
    protection.register(
      context.primaryPlayer.closest(
        "main, article, [data-player-container], [class*='player' i]"
      ) ?? context.primaryPlayer
    );
  }
}

export function scoreCandidate(
  candidate: Element,
  context: GenericDetectionContext
): CandidateScore {
  if (
    context.protection.intersects(candidate) ||
    candidate.closest(
      "form, nav, footer, [class*='account' i], [class*='legal' i], [class*='checkout' i]"
    )
  ) {
    return { candidate, score: 0, rejected: true, signals: ["protected-context"] };
  }
  const signals: string[] = [];
  let score = 0;
  const interfaceText = interfaceTokens(candidate);
  if (RECOMMENDATION_TERMS.some((term) => interfaceText.includes(term))) {
    score += GENERIC_WEIGHTS.recommendationLabel;
    signals.push("recommendation-label");
  }
  if (
    context.pageKind === "blocked-listing" ||
    LISTING_TERMS.some((term) => interfaceText.includes(term))
  ) {
    score += GENERIC_WEIGHTS.blockedListing;
    signals.push("blocked-listing");
  }
  const links = candidate.querySelectorAll(
    'a[href*="video" i], a[href*="watch" i], a[href^="/v/"]'
  );
  if (links.length >= 4) {
    score += GENERIC_WEIGHTS.repeatedCards;
    signals.push("repeated-cards");
  }
  if (links.length >= 3 && context.primaryPlayer && isNear(candidate, context.primaryPlayer)) {
    score += GENERIC_WEIGHTS.videoLinksNearPlayer;
    signals.push("video-links-near-player");
  }
  if (
    (candidate.matches("aside") || candidate.getAttribute("role") === "complementary") &&
    context.primaryPlayer &&
    isNear(candidate, context.primaryPlayer)
  ) {
    score += GENERIC_WEIGHTS.complementaryNearPlayer;
    signals.push("complementary-near-player");
  }
  return { candidate, score, rejected: false, signals };
}

export function detectGeneric(
  root: Document | Element | ShadowRoot,
  context: GenericDetectionContext
): RuleMatch[] {
  const candidates = new Set<Element>();
  const selector = "section, aside, [role='complementary'], [aria-label], [id], [class]";
  if (root instanceof Element && root.matches(selector)) candidates.add(root);
  for (const candidate of root.querySelectorAll(selector)) {
    if (candidates.size >= 500) break;
    candidates.add(candidate);
  }
  const matches: RuleMatch[] = [];
  for (const candidate of candidates) {
    const result = scoreCandidate(candidate, context);
    if (!result.rejected && result.score >= GENERIC_THRESHOLD) {
      matches.push({ ruleId: "generic-high-confidence", candidate, score: result.score });
    }
  }
  return pruneNested(matches);
}

function interfaceTokens(candidate: Element): string {
  const headings = [...candidate.querySelectorAll("h1,h2,h3,h4,[role='heading']")]
    .slice(0, 4)
    .map((heading) => heading.textContent ?? "");
  return [
    candidate.id,
    candidate.className,
    candidate.getAttribute("aria-label") ?? "",
    ...headings
  ]
    .join(" ")
    .toLowerCase();
}

function isNear(a: Element, b: Element): boolean {
  return (
    a.parentElement === b.parentElement ||
    a.previousElementSibling?.contains(b) === true ||
    b.closest("main")?.contains(a) === true
  );
}

function pruneNested(matches: RuleMatch[]): RuleMatch[] {
  return matches.filter(
    (match, index) =>
      !matches.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.candidate.contains(match.candidate) &&
          other.score >= match.score
      )
  );
}
