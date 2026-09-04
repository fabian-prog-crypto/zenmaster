function normalizeDomainRoot(value) {
  const normalized = String(value).trim().toLowerCase().replace(/\.$/, "");
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

function matchesRoot(hostname, root) {
  const host = normalizeDomainRoot(hostname);
  const normalizedRoot = normalizeDomainRoot(root);
  return host === normalizedRoot || host.endsWith(`.${normalizedRoot}`);
}

function rootsOverlap(first, second) {
  return matchesRoot(first, second) || matchesRoot(second, first);
}

export function domainRootsFromCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length !== 50) {
    throw new Error(`Expected 50 catalog adapters, got ${catalog?.length ?? 0}`);
  }
  const ids = new Set();
  const claimed = [];
  for (const entry of catalog) {
    if (ids.has(entry.id)) throw new Error(`Duplicate adapter ID: ${entry.id}`);
    ids.add(entry.id);
    if (!Array.isArray(entry.domainRoots) || entry.domainRoots.length === 0) {
      throw new Error(`Adapter ${entry.id} has no domain roots`);
    }
    const roots = entry.domainRoots.map(normalizeDomainRoot);
    if (!roots.includes(normalizeDomainRoot(entry.primaryHostname))) {
      throw new Error(`Adapter ${entry.id} does not own its primary hostname`);
    }
    for (let index = 0; index < roots.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < roots.length; otherIndex += 1) {
        if (rootsOverlap(roots[index], roots[otherIndex])) {
          throw new Error(`Overlapping domain roots for ${entry.id}`);
        }
      }
    }
    for (const root of roots) {
      const conflict = claimed.find((candidate) => rootsOverlap(root, candidate.root));
      if (conflict) {
        throw new Error(`Overlapping domain roots for ${entry.id} and ${conflict.adapterId}`);
      }
      claimed.push({ adapterId: entry.id, root });
    }
  }
  return claimed.map((claim) => claim.root).sort();
}

export function hostPatternsFromCatalog(catalog) {
  return domainRootsFromCatalog(catalog).map((root) => `https://*.${root}/*`);
}
