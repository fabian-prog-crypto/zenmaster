import { describe, expect, it } from "vitest";
import catalog from "../../src/adapters/catalog.json" with { type: "json" };
import { adapterRegistry } from "../../src/adapters/index.js";

describe("verified domain root coverage", () => {
  it("resolves reported regional and deep subdomains", () => {
    expect(adapterRegistry.getAdapterForHostname("ge.xhamster.desi")?.id).toBe("xhamster");
    expect(adapterRegistry.getAdapterForHostname("www.xhamster.desi")?.id).toBe("xhamster");
    expect(adapterRegistry.getAdapterForHostname("a.b.xhamster.desi.")?.id).toBe("xhamster");
    expect(adapterRegistry.getAdapterForHostname("fr.pornhub.org")?.id).toBe("pornhub");
  });

  it("resolves each primary hostname and a representative subdomain", () => {
    for (const entry of catalog) {
      expect(adapterRegistry.getAdapterForHostname(entry.primaryHostname)?.id).toBe(entry.id);
      expect(adapterRegistry.getAdapterForHostname(`region.${entry.primaryHostname}`)?.id).toBe(
        entry.id
      );
    }
  });

  it("rejects lookalike and suffix-confusion hostnames", () => {
    expect(adapterRegistry.getAdapterForHostname("notxhamster.desi")).toBeUndefined();
    expect(adapterRegistry.getAdapterForHostname("xhamster.desi.example")).toBeUndefined();
    expect(adapterRegistry.getAdapterForHostname("fake-pornhub.org")).toBeUndefined();
  });
});
