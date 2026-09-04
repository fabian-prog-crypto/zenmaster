import type { ProtectionRegistry } from "./protection-registry.js";

interface OriginalLinkState {
  tabindex: string | null;
  ariaDisabled: string | null;
}

export class LinkNeutralizer {
  readonly #owned = new Map<HTMLAnchorElement, OriginalLinkState>();
  readonly #preventOwnedClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[data-afb-link-neutralized]");
    if (!link || !this.#owned.has(link)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  constructor(
    private readonly page: Document,
    private readonly protection: ProtectionRegistry
  ) {}

  neutralize(links: Iterable<HTMLAnchorElement>): number {
    let neutralized = 0;
    for (const link of links) {
      if (this.protection.intersects(link) || this.#owned.has(link)) continue;
      this.#owned.set(link, {
        tabindex: link.getAttribute("tabindex"),
        ariaDisabled: link.getAttribute("aria-disabled")
      });
      link.setAttribute("data-afb-link-neutralized", "creator-path");
      link.setAttribute("tabindex", "-1");
      link.setAttribute("aria-disabled", "true");
      neutralized += 1;
    }
    if (neutralized > 0 && this.#owned.size === neutralized) {
      this.page.addEventListener("click", this.#preventOwnedClick, true);
    }
    return neutralized;
  }

  restoreAll(): void {
    for (const [link, original] of this.#owned) {
      link.removeAttribute("data-afb-link-neutralized");
      restoreAttribute(link, "tabindex", original.tabindex);
      restoreAttribute(link, "aria-disabled", original.ariaDisabled);
    }
    this.#owned.clear();
    this.page.removeEventListener("click", this.#preventOwnedClick, true);
  }

  get totalNeutralized(): number {
    return this.#owned.size;
  }
}

function restoreAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}
