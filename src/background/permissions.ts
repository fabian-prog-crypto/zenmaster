import catalogJson from "../adapters/catalog.json" with { type: "json" };
import type { CatalogEntry } from "../adapters/types.js";
import {
  normalizeCustomSite,
  originPatternFor,
  parseStoredState,
  type StoredCustomSite
} from "../shared/storage.js";
import type { ChromeApi } from "./chrome-api.js";
import { customRegistrationsForOrigin, registrationIdsForOrigin } from "./registrations.js";

const catalog = catalogJson as readonly CatalogEntry[];
const builtInHosts = new Set(
  catalog.flatMap((entry) => entry.domainRoots.flatMap((hostname) => [hostname, `www.${hostname}`]))
);

export type AddSiteResult =
  | { ok: true; alreadyProtected: boolean; reloadRequired: boolean }
  | { ok: false; error: "permission-denied" | "invalid-origin" };

export async function addCustomSite(
  api: ChromeApi,
  request: { tabId: number; origin: string }
): Promise<AddSiteResult> {
  let normalized;
  try {
    normalized = normalizeCustomSite(request.origin);
  } catch {
    return { ok: false, error: "invalid-origin" };
  }
  if (builtInHosts.has(normalized.hostname)) {
    return { ok: true, alreadyProtected: true, reloadRequired: false };
  }

  const permission = api.permissionsRequest(normalized.originPattern);
  if (!(await permission)) return { ok: false, error: "permission-denied" };

  const state = parseStoredState(await api.storageGet());
  const alreadyProtected = state.customSites.some(
    (site) => site.scheme === normalized.scheme && site.hostname === normalized.hostname
  );
  if (!alreadyProtected) {
    state.customSites.push({
      scheme: normalized.scheme,
      hostname: normalized.hostname,
      addedAt: Date.now()
    });
    await api.storageSet(state);
  }

  const scripts = await customRegistrationsForOrigin(normalized.originPattern);
  const existing = await api.getRegisteredContentScripts();
  const existingIds = new Set(existing.map((script) => script.id));
  const missing = scripts.filter((script) => !existingIds.has(script.id));
  if (missing.length) await api.registerContentScripts(missing);

  let reloadRequired = false;
  try {
    await api.executeScript(request.tabId, "content/route-bridge.js", "MAIN");
    await api.executeScript(request.tabId, "content/bootstrap.js", "ISOLATED");
  } catch {
    reloadRequired = true;
  }
  return { ok: true, alreadyProtected, reloadRequired };
}

export async function removeCustomSite(
  api: ChromeApi,
  site: Pick<StoredCustomSite, "scheme" | "hostname">
): Promise<{ ok: true; reloadRequired: true }> {
  const normalized = normalizeCustomSite(`${site.scheme}://${site.hostname}/`);
  const ids = await registrationIdsForOrigin(normalized.originPattern);
  await api.unregisterContentScripts([ids.isolated, ids.main]);
  const state = parseStoredState(await api.storageGet());
  state.customSites = state.customSites.filter(
    (candidate) =>
      candidate.scheme !== normalized.scheme || candidate.hostname !== normalized.hostname
  );
  await api.storageSet(state);
  await api.permissionsRemove(originPatternFor(normalized));
  return { ok: true, reloadRequired: true };
}
