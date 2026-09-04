import type { SiteAdapter } from "../adapters/types.js";
import type { PageKind } from "../shared/page-kind.js";

export type ClassificationResult =
  | { pageKind: PageKind; degraded: false }
  | { pageKind: "unknown"; degraded: true; reason: "classification-error" };

export function classifyPage(adapter: SiteAdapter, url: URL, page: Document): ClassificationResult {
  try {
    const pageKind = adapter.classify({
      url,
      path: url.pathname.toLowerCase(),
      queryKeys: new Set([...url.searchParams.keys()].map((key) => key.toLowerCase())),
      document: page,
      has(selector) {
        try {
          return page.querySelector(selector) !== null;
        } catch {
          return false;
        }
      }
    });
    return { pageKind, degraded: false };
  } catch {
    return { pageKind: "unknown", degraded: true, reason: "classification-error" };
  }
}
