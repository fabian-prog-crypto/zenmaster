import type { SiteAdapter } from "./types.js";

export function normalizeDomainRoot(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  if (
    !normalized ||
    normalized.includes("/") ||
    normalized.startsWith(".") ||
    normalized.endsWith(".")
  ) {
    throw new Error(`Invalid domain root: ${value}`);
  }
  return normalized;
}

export function hostnameMatchesDomainRoot(hostname: string, root: string): boolean {
  const normalizedHostname = normalizeDomainRoot(hostname);
  const normalizedRoot = normalizeDomainRoot(root);
  return normalizedHostname === normalizedRoot || normalizedHostname.endsWith(`.${normalizedRoot}`);
}

export function rootsOverlap(first: string, second: string): boolean {
  return hostnameMatchesDomainRoot(first, second) || hostnameMatchesDomainRoot(second, first);
}

export function httpsPatternForDomainRoot(root: string): string {
  return `https://*.${normalizeDomainRoot(root)}/*`;
}

export function validateDomainOwnership(adapters: readonly SiteAdapter[]): void {
  const claimed: Array<{ adapterId: string; root: string }> = [];
  for (const adapter of adapters) {
    const roots = adapter.domainRoots.map(normalizeDomainRoot);
    for (let index = 0; index < roots.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < roots.length; otherIndex += 1) {
        if (rootsOverlap(roots[index]!, roots[otherIndex]!)) {
          throw new Error(
            `Overlapping domain roots for ${adapter.id}: ${roots[index]} and ${roots[otherIndex]}`
          );
        }
      }
    }
    for (const root of roots) {
      const conflict = claimed.find((candidate) => rootsOverlap(root, candidate.root));
      if (conflict) {
        throw new Error(
          `Overlapping domain roots for ${adapter.id} and ${conflict.adapterId}: ${root} and ${conflict.root}`
        );
      }
      claimed.push({ adapterId: adapter.id, root });
    }
  }
}
