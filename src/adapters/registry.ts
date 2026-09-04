import type { SiteAdapter } from "./types.js";
import {
  hostnameMatchesDomainRoot,
  normalizeDomainRoot,
  validateDomainOwnership
} from "./domain-roots.js";

export interface AdapterRegistry {
  readonly size: number;
  ids(): readonly string[];
  getAdapterForHostname(hostname: string): SiteAdapter | undefined;
}

export function createAdapterRegistry(adapters: readonly SiteAdapter[]): AdapterRegistry {
  const ids = new Set<string>();
  validateDomainOwnership(adapters);
  for (const adapter of adapters) {
    if (ids.has(adapter.id)) throw new Error(`Duplicate adapter ID: ${adapter.id}`);
    ids.add(adapter.id);
  }
  const orderedIds = Object.freeze(adapters.map((adapter) => adapter.id));
  return Object.freeze({
    size: adapters.length,
    ids: () => orderedIds,
    getAdapterForHostname: (hostname: string) => {
      const normalized = normalizeDomainRoot(hostname);
      return adapters.find((adapter) =>
        adapter.domainRoots.some((root) => hostnameMatchesDomainRoot(normalized, root))
      );
    }
  });
}
