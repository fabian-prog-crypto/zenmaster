import { describe, expect, it } from "vitest";
import { detectGeneric } from "../../src/content/generic-detector.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";

describe("initial scan performance", () => {
  it("processes a 1,000-card document below the 50 ms p95 budget", () => {
    document.body.innerHTML = Array.from(
      { length: 250 },
      (_, index) =>
        `<section class="group-${index}"><a href="/video/1"></a><a href="/video/2"></a><a href="/video/3"></a><a href="/video/4"></a></section>`
    ).join("");
    const run = () => {
      const start = performance.now();
      detectGeneric(document, { pageKind: "unknown", protection: new ProtectionRegistry() });
      return performance.now() - start;
    };
    for (let index = 0; index < 5; index += 1) run();
    const timings = Array.from({ length: 30 }, run).sort((a, b) => a - b);
    const p95 = timings[Math.ceil(timings.length * 0.95) - 1]!;
    expect(p95).toBeLessThan(50);
  });
});
