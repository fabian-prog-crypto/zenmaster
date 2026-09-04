import { describe, expect, it } from "vitest";
import { defineAdapter } from "../../src/adapters/define-adapter.js";
import { adapterRegistry } from "../../src/adapters/index.js";
import { classifyPage } from "../../src/content/classifier.js";

const adapter = defineAdapter({
  id: "example",
  displayName: "Example",
  domainRoots: ["example.com"],
  ruleVersion: 1,
  frameSupport: "top-only",
  classify(context) {
    if (context.path.includes("denied")) return "restricted";
    if (context.queryKeys.has("q")) return "search";
    if (context.path.includes("favorites")) return "library";
    if (context.path.includes("watch")) return "watch";
    if (context.path.includes("category")) return "blocked-listing";
    if (context.path === "/") return "home";
    return "unknown";
  },
  protectedSelectors: {},
  hideSelectors: {},
  globalRecommendationSelectors: [],
  healthChecks: {}
});

describe("page classifier", () => {
  it("lets protected query routes win over listing-like path tokens", () => {
    expect(classifyPage(adapter, new URL("https://example.com/category?q=x"), document)).toEqual({
      pageKind: "search",
      degraded: false
    });
    expect(
      classifyPage(adapter, new URL("https://example.com/popular/favorites"), document).pageKind
    ).toBe("library");
  });

  it("fails safely when adapter classification throws", () => {
    const broken = defineAdapter({
      ...adapter,
      id: "broken",
      classify: () => {
        throw new Error("boom");
      }
    });
    expect(classifyPage(broken, new URL("https://example.com"), document)).toEqual({
      pageKind: "unknown",
      degraded: true,
      reason: "classification-error"
    });
  });

  it("classifies creator profile routes as blocked listings", () => {
    const known = adapterRegistry.getAdapterForHostname("noodlemagazine.com")!;
    expect(
      classifyPage(known, new URL("https://noodlemagazine.com/profile/fixture"), document).pageKind
    ).toBe("blocked-listing");
    expect(
      classifyPage(known, new URL("https://noodlemagazine.com/channel/fixture"), document).pageKind
    ).toBe("blocked-listing");
  });
});
