import type { PageKind } from "../shared/page-kind.js";

export interface CatalogEntry {
  id: string;
  displayName: string;
  primaryHostname: string;
  aliases: string[];
  family: "aylo" | "wgcz" | "avs" | "8579" | "trendio" | "standalone";
}

export interface ClassificationContext {
  readonly url: URL;
  readonly path: string;
  readonly queryKeys: ReadonlySet<string>;
  readonly document: Document;
  has(selector: string): boolean;
}

export type ContainerResolution =
  { type: "self" } | { type: "closest"; selector: string } | { type: "parent"; levels: number };

export interface Rule {
  id: string;
  selector: string;
  container: ContainerResolution;
}

export interface HealthCheck {
  id: string;
  selector: string;
  required: boolean;
}

export type AutoAdvanceRule =
  | { type: "toggle-off"; selector: string; stateAttribute: string; onValue: string }
  | { type: "hide-countdown"; selector: string }
  | { type: "ended-guard"; selector: string }
  | { type: "none" };

export interface SiteAdapter {
  id: string;
  displayName: string;
  hostnames: readonly string[];
  ruleVersion: number;
  frameSupport: "top-only" | "matching-frames";
  classify(context: ClassificationContext): PageKind;
  protectedSelectors: Partial<Record<PageKind, readonly string[]>>;
  hideSelectors: Partial<Record<PageKind, readonly Rule[]>>;
  globalRecommendationSelectors: readonly Rule[];
  healthChecks: Partial<Record<PageKind, readonly HealthCheck[]>>;
  disableAutoAdvance?: AutoAdvanceRule;
}
