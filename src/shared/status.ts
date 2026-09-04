import type { PageKind } from "./page-kind.js";

export type PageStatusState =
  | "active-known"
  | "active-generic"
  | "needs-update"
  | "unsupported"
  | "restricted"
  | "permission-denied";

export interface PageStatus {
  state: PageStatusState;
  adapterId?: string;
  pageKind?: PageKind;
  blockedCount: number;
  blockedVideoCount: number;
  autoAdvanceBlocked: boolean;
}
