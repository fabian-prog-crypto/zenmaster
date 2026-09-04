import type { Rule } from "../adapters/types.js";
import type { ProtectionRegistry } from "./protection-registry.js";

export interface BlockResult {
  newlyBlocked: number;
  totalBlocked: number;
  errors: string[];
}

export class Blocker {
  readonly #owned = new Set<Element>();

  constructor(
    private readonly adapterId: string,
    private readonly page: Document,
    private readonly protection: ProtectionRegistry
  ) {
    this.#installStyle();
  }

  applyRules(root: Document | Element | ShadowRoot, rules: readonly Rule[]): BlockResult {
    let newlyBlocked = 0;
    const errors: string[] = [];
    for (const rule of rules) {
      try {
        for (const match of collectMatches(root, rule.selector)) {
          const candidate = resolveContainer(match, rule);
          if (
            !candidate ||
            this.protection.intersects(candidate) ||
            this.#hasOwnedAncestor(candidate)
          )
            continue;
          this.#releaseOwnedDescendants(candidate);
          candidate.setAttribute("data-afb-hidden", `${this.adapterId}:${rule.id}`);
          this.#owned.add(candidate);
          newlyBlocked += 1;
        }
      } catch (error) {
        errors.push(`${rule.id}:${error instanceof Error ? error.message : "rule-error"}`);
      }
    }
    this.#purgeDisconnected();
    return { newlyBlocked, totalBlocked: this.#owned.size, errors };
  }

  blockElements(elements: Iterable<Element>, ruleId: string): BlockResult {
    let newlyBlocked = 0;
    for (const candidate of elements) {
      if (this.protection.intersects(candidate) || this.#intersectsOwned(candidate)) continue;
      candidate.setAttribute("data-afb-hidden", `${this.adapterId}:${ruleId}`);
      this.#owned.add(candidate);
      newlyBlocked += 1;
    }
    this.#purgeDisconnected();
    return { newlyBlocked, totalBlocked: this.#owned.size, errors: [] };
  }

  restoreAll(): void {
    for (const element of this.#owned) {
      const value = element.getAttribute("data-afb-hidden");
      if (value?.startsWith(`${this.adapterId}:`)) element.removeAttribute("data-afb-hidden");
    }
    this.#owned.clear();
  }

  get totalBlocked(): number {
    this.#purgeDisconnected();
    return this.#owned.size;
  }

  get hiddenRoots(): readonly Element[] {
    this.#purgeDisconnected();
    return [...this.#owned];
  }

  #installStyle(): void {
    if (this.page.getElementById("afb-hide-style")) return;
    const style = this.page.createElement("style");
    style.id = "afb-hide-style";
    style.textContent =
      "[data-afb-hidden]{display:none!important}[data-afb-link-neutralized]{pointer-events:none!important;cursor:default!important}";
    (this.page.head ?? this.page.documentElement).append(style);
  }

  #purgeDisconnected(): void {
    for (const element of this.#owned) if (!element.isConnected) this.#owned.delete(element);
  }

  #intersectsOwned(candidate: Element): boolean {
    for (const owned of this.#owned) {
      if (owned === candidate || owned.contains(candidate) || candidate.contains(owned))
        return true;
    }
    return false;
  }

  #hasOwnedAncestor(candidate: Element): boolean {
    for (const owned of this.#owned) {
      if (owned === candidate || owned.contains(candidate)) return true;
    }
    return false;
  }

  #releaseOwnedDescendants(candidate: Element): void {
    for (const owned of this.#owned) {
      if (!candidate.contains(owned)) continue;
      const value = owned.getAttribute("data-afb-hidden");
      if (value?.startsWith(`${this.adapterId}:`)) owned.removeAttribute("data-afb-hidden");
      this.#owned.delete(owned);
    }
  }
}

function collectMatches(root: Document | Element | ShadowRoot, selector: string): Element[] {
  const matches: Element[] = [];
  if (root instanceof Element && root.matches(selector)) matches.push(root);
  matches.push(...root.querySelectorAll(selector));
  return matches;
}

function resolveContainer(match: Element, rule: Rule): Element | null {
  switch (rule.container.type) {
    case "self":
      return match;
    case "closest":
      return match.closest(rule.container.selector);
    case "parent": {
      let current: Element | null = match;
      for (let index = 0; index < rule.container.levels; index += 1)
        current = current?.parentElement ?? null;
      return current;
    }
  }
}
