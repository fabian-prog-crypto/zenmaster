import { beforeEach, describe, expect, it } from "vitest";
import { Blocker } from "../../src/content/blocker.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";

describe("reversible blocker", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="search"><div class="card"></div></main>
      <aside id="related"><div class="card"></div></aside>
      <section id="nested"><div class="target"></div></section>`;
  });

  it("never hides a protected root or its ancestors and restores owned marks", () => {
    const protection = new ProtectionRegistry();
    protection.register(document.querySelector("#search")!);
    const blocker = new Blocker("example", document, protection);
    const result = blocker.applyRules(document, [
      { id: "cards", selector: ".card", container: { type: "closest", selector: "main, aside" } }
    ]);
    expect(document.querySelector("#search")!.hasAttribute("data-afb-hidden")).toBe(false);
    expect(document.querySelector("#related")!.getAttribute("data-afb-hidden")).toBe(
      "example:cards"
    );
    expect(result.totalBlocked).toBe(1);
    blocker.restoreAll();
    expect(document.querySelector("#related")!.hasAttribute("data-afb-hidden")).toBe(false);
  });

  it("supports fixed parent traversal and catches bad runtime selectors", () => {
    const blocker = new Blocker("example", document, new ProtectionRegistry());
    const result = blocker.applyRules(document, [
      { id: "parent", selector: ".target", container: { type: "parent", levels: 1 } },
      { id: "bad", selector: "[", container: { type: "self" } }
    ]);
    expect(document.querySelector("#nested")!.getAttribute("data-afb-hidden")).toBe(
      "example:parent"
    );
    expect(result.errors).toHaveLength(1);
  });

  it("blocks detector-selected elements through the same protected boundary", () => {
    const protection = new ProtectionRegistry();
    protection.register(document.querySelector("#search")!);
    const blocker = new Blocker("generic", document, protection);
    const result = blocker.blockElements(
      [document.querySelector("#search")!, document.querySelector("#related")!],
      "generic-high-confidence"
    );
    expect(result.totalBlocked).toBe(1);
    expect(document.querySelector("#related")!.hasAttribute("data-afb-hidden")).toBe(true);
  });

  it("does not double-own nested exact and structural matches", () => {
    const blocker = new Blocker("example", document, new ProtectionRegistry());
    blocker.blockElements([document.querySelector("#related")!], "exact");

    const result = blocker.blockElements(
      [document.querySelector("#related .card")!],
      "structural-high-confidence"
    );

    expect(result.newlyBlocked).toBe(0);
    expect(result.totalBlocked).toBe(1);
    expect(document.querySelector("#related .card")!.hasAttribute("data-afb-hidden")).toBe(false);
  });
});
