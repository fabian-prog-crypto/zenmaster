import { describe, expect, it } from "vitest";
import { detectGeneric } from "../../src/content/generic-detector.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";

describe("mutation batch performance", () => {
  it("processes 100 inserted cards below 50 ms without a document scan", () => {
    const root = document.createElement("section");
    root.setAttribute("aria-label", "Recommended");
    root.innerHTML = Array.from(
      { length: 100 },
      (_, index) => `<a href="/video/${index}"></a>`
    ).join("");
    document.body.replaceChildren(root);
    const start = performance.now();
    const matches = detectGeneric(root, {
      pageKind: "unknown",
      protection: new ProtectionRegistry()
    });
    const duration = performance.now() - start;
    expect(matches).toHaveLength(1);
    expect(duration).toBeLessThan(50);
  });
});
