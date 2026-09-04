import type { PageKind } from "../shared/page-kind.js";
import type { ProtectionRegistry } from "./protection-registry.js";

export interface CreatorDetectionContext {
  pageKind: PageKind;
  protection: ProtectionRegistry;
  primaryPlayer?: Element;
}

export interface CreatorDetection {
  containers: readonly Element[];
  links: readonly HTMLAnchorElement[];
}

const CREATOR_CONTAINER = [
  "[class*='uploader' i]",
  "[id*='uploader' i]",
  "[class*='creator-info' i]",
  "[class*='channel-info' i]",
  "[data-testid*='uploader' i]",
  "[data-role*='uploader' i]"
].join(",");
const WATCH_METADATA =
  "[class*='video-info' i], [class*='metadata' i], [class*='details' i], [data-video-details]";
const CREATOR_PATH =
  /\/(?:users?|profiles?|creators?|uploaders?|channels?|models?|performers?|pornstars?|studios?)(?:\/|$)/i;
const MORE_FROM = /\b(?:more\s+(?:from|by)|from\s+this\s+(?:account|creator|channel))\b/i;
const EXCLUDED = "nav, header, footer, form, [role='navigation']";

export function detectCreatorPaths(
  root: Document | Element | ShadowRoot,
  context: CreatorDetectionContext
): CreatorDetection {
  if (context.pageKind !== "watch") return { containers: [], links: [] };
  const containers = new Set<Element>();
  for (const candidate of collect(root, CREATOR_CONTAINER)) {
    if (canSelect(candidate, context)) containers.add(candidate);
  }
  for (const candidate of collect(root, "section, aside, [aria-label], [id], [class]")) {
    if (MORE_FROM.test(interfaceTokens(candidate)) && canSelect(candidate, context)) {
      containers.add(candidate);
    }
  }

  const links = new Set<HTMLAnchorElement>();
  for (const metadata of collect(root, WATCH_METADATA)) {
    if (!canSelect(metadata, context)) continue;
    for (const link of metadata.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      if (
        isCreatorLink(link) &&
        !context.protection.intersects(link) &&
        ![...containers].some((container) => container.contains(link))
      ) {
        links.add(link);
      }
    }
  }
  return { containers: preferSmallest(containers), links: [...links] };
}

function collect(root: Document | Element | ShadowRoot, selector: string): Element[] {
  const matches: Element[] = [];
  if (root instanceof Element && root.matches(selector)) matches.push(root);
  matches.push(...root.querySelectorAll(selector));
  return matches;
}

function canSelect(candidate: Element, context: CreatorDetectionContext): boolean {
  return (
    !candidate.matches(EXCLUDED) &&
    candidate.closest(EXCLUDED) === null &&
    !context.protection.intersects(candidate) &&
    (!context.primaryPlayer || !candidate.contains(context.primaryPlayer))
  );
}

function interfaceTokens(candidate: Element): string {
  return [
    candidate.id,
    candidate.className,
    candidate.getAttribute("aria-label") ?? "",
    ...[...candidate.querySelectorAll("h1,h2,h3,h4,[role='heading']")]
      .slice(0, 3)
      .map((heading) => heading.textContent ?? "")
  ].join(" ");
}

function isCreatorLink(link: HTMLAnchorElement): boolean {
  return CREATOR_PATH.test(link.getAttribute("href") ?? "");
}

function preferSmallest(containers: ReadonlySet<Element>): Element[] {
  return [...containers].filter(
    (container) =>
      ![...containers].some((other) => other !== container && container.contains(other))
  );
}
