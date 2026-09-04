export interface StoredCustomSite {
  scheme: "http" | "https";
  hostname: string;
  addedAt: number;
}

export interface StoredStateV1 {
  schemaVersion: 1;
  customSites: StoredCustomSite[];
}

export interface NormalizedCustomSite {
  scheme: "http" | "https";
  hostname: string;
  originPattern: string;
}

const EMPTY_STATE: StoredStateV1 = { schemaVersion: 1, customSites: [] };

export function normalizeCustomSite(input: string): NormalizedCustomSite {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Malformed URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Unsupported URL scheme");
  }
  if (url.username || url.password) {
    throw new Error("Credentials are not allowed");
  }
  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname.includes("*") || hostname.length > 253) {
    throw new Error("Invalid hostname");
  }
  const scheme = url.protocol.slice(0, -1) as "http" | "https";
  return { scheme, hostname, originPattern: `${scheme}://${hostname}/*` };
}

export function parseStoredState(input: unknown): StoredStateV1 {
  if (!isRecord(input) || input.schemaVersion !== 1 || !Array.isArray(input.customSites)) {
    return { ...EMPTY_STATE, customSites: [] };
  }
  const sites = new Map<string, StoredCustomSite>();
  for (const candidate of input.customSites) {
    if (!isRecord(candidate)) continue;
    const { scheme, hostname, addedAt } = candidate;
    if (
      (scheme !== "http" && scheme !== "https") ||
      typeof hostname !== "string" ||
      typeof addedAt !== "number" ||
      !Number.isFinite(addedAt) ||
      addedAt < 0
    ) {
      continue;
    }
    let normalized: NormalizedCustomSite;
    try {
      normalized = normalizeCustomSite(`${scheme}://${hostname}/`);
    } catch {
      continue;
    }
    const key = `${normalized.scheme}:${normalized.hostname}`;
    const previous = sites.get(key);
    if (!previous || addedAt < previous.addedAt) {
      sites.set(key, { scheme: normalized.scheme, hostname: normalized.hostname, addedAt });
    }
  }
  return {
    schemaVersion: 1,
    customSites: [...sites.values()].sort((a, b) => a.addedAt - b.addedAt)
  };
}

export function originPatternFor(site: Pick<StoredCustomSite, "scheme" | "hostname">): string {
  return `${site.scheme}://${site.hostname}/*`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
