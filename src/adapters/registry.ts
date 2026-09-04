import type { SiteAdapter } from "./types.js";

export interface AdapterRegistry {
  readonly size: number;
  ids(): readonly string[];
  getAdapterForHostname(hostname: string): SiteAdapter | undefined;
}

export function createAdapterRegistry(adapters: readonly SiteAdapter[]): AdapterRegistry {
  const byHost = new Map<string, SiteAdapter>();
  const ids = new Set<string>();
  for (const adapter of adapters) {
    if (ids.has(adapter.id)) throw new Error(`Duplicate adapter ID: ${adapter.id}`);
    ids.add(adapter.id);
    for (const hostname of adapter.hostnames) {
      const normalized = hostname.toLowerCase();
      if (byHost.has(normalized)) throw new Error(`Duplicate hostname: ${normalized}`);
      byHost.set(normalized, adapter);
    }
  }
  const orderedIds = Object.freeze(adapters.map((adapter) => adapter.id));
  return Object.freeze({
    size: adapters.length,
    ids: () => orderedIds,
    getAdapterForHostname: (hostname: string) => byHost.get(hostname.toLowerCase())
  });
}
