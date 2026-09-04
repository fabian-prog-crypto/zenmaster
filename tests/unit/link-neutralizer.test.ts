import { beforeEach, describe, expect, it } from "vitest";
import { LinkNeutralizer } from "../../src/content/link-neutralizer.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";

describe("creator link neutralizer", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = `<head></head><body>
      <a id="creator" href="/profile/fixture" tabindex="2">[creator]</a>
    </body>`;
  });

  it("prevents clicking and keyboard focus while active", () => {
    const link = document.querySelector<HTMLAnchorElement>("#creator")!;
    const neutralizer = new LinkNeutralizer(document, new ProtectionRegistry());
    neutralizer.neutralize([link]);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(link.tabIndex).toBe(-1);
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.hasAttribute("data-afb-link-neutralized")).toBe(true);
    expect(neutralizer.totalNeutralized).toBe(1);
  });

  it("restores original attributes and click behavior", () => {
    const link = document.querySelector<HTMLAnchorElement>("#creator")!;
    const neutralizer = new LinkNeutralizer(document, new ProtectionRegistry());
    neutralizer.neutralize([link]);
    neutralizer.restoreAll();

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(link.getAttribute("tabindex")).toBe("2");
    expect(link.hasAttribute("aria-disabled")).toBe(false);
    expect(link.hasAttribute("data-afb-link-neutralized")).toBe(false);
    expect(neutralizer.totalNeutralized).toBe(0);
  });

  it("does not neutralize a protected link", () => {
    const link = document.querySelector<HTMLAnchorElement>("#creator")!;
    const protection = new ProtectionRegistry();
    protection.register(link);
    const neutralizer = new LinkNeutralizer(document, protection);

    expect(neutralizer.neutralize([link])).toBe(0);
    expect(link.hasAttribute("data-afb-link-neutralized")).toBe(false);
  });
});
