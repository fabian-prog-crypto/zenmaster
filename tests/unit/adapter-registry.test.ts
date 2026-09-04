import { describe, expect, it } from "vitest";
import { defineAdapter } from "../../src/adapters/define-adapter.js";
import { createAdapterRegistry } from "../../src/adapters/registry.js";

const adapterInput = {
  id: "example",
  displayName: "Example",
  hostnames: ["example.com", "www.example.com"],
  ruleVersion: 1,
  frameSupport: "top-only" as const,
  classify: () => "unknown" as const,
  protectedSelectors: {},
  hideSelectors: {},
  globalRecommendationSelectors: [],
  healthChecks: {}
};

describe("adapter registry", () => {
  it("normalizes hostnames and freezes adapters", () => {
    const adapter = defineAdapter({
      ...adapterInput,
      hostnames: ["EXAMPLE.COM", "www.example.com"]
    });
    const registry = createAdapterRegistry([adapter]);
    expect(registry.getAdapterForHostname("WWW.EXAMPLE.COM")).toBe(adapter);
    expect(registry.ids()).toEqual(["example"]);
    expect(registry.size).toBe(1);
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("rejects invalid selectors and duplicate hosts", () => {
    expect(() =>
      defineAdapter({
        ...adapterInput,
        globalRecommendationSelectors: [
          { id: "bad", selector: "[", container: { type: "self" as const } }
        ]
      })
    ).toThrow("Invalid selector");
    const first = defineAdapter(adapterInput);
    const second = defineAdapter({ ...adapterInput, id: "second" });
    expect(() => createAdapterRegistry([first, second])).toThrow("Duplicate hostname");
  });
});
