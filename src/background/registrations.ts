import catalogJson from "../adapters/catalog.json" with { type: "json" };
import type { CatalogEntry } from "../adapters/types.js";
import { originPatternFor, parseStoredState, type StoredCustomSite } from "../shared/storage.js";
import type { ChromeApi, RegisteredScriptConfig } from "./chrome-api.js";

const catalog = catalogJson as readonly CatalogEntry[];
const BUILTIN_ISOLATED_ID = "afb_builtin_isolated";
const BUILTIN_MAIN_ID = "afb_builtin_main";

export interface RegistrationIds {
  isolated: string;
  main: string;
}

export async function registrationIdsForOrigin(pattern: string): Promise<RegistrationIds> {
  const bytes = new TextEncoder().encode(pattern);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = [...digest.slice(0, 20)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    isolated: `afb_custom_isolated_${hash}`,
    main: `afb_custom_main_${hash}`
  };
}

export function builtInPatterns(): string[] {
  return catalog
    .flatMap((entry) =>
      entry.domainRoots.flatMap((hostname) => [
        `https://${hostname}/*`,
        `https://www.${hostname}/*`
      ])
    )
    .sort();
}

export async function customRegistrationsForOrigin(
  pattern: string
): Promise<RegisteredScriptConfig[]> {
  const ids = await registrationIdsForOrigin(pattern);
  return [
    registration(ids.isolated, [pattern], "content/bootstrap.js", "ISOLATED", false),
    registration(ids.main, [pattern], "content/route-bridge.js", "MAIN", false)
  ];
}

export async function reconcileRegistrations(
  api: ChromeApi
): Promise<{ customSites: StoredCustomSite[] }> {
  const state = parseStoredState(await api.storageGet());
  const grantedSites: StoredCustomSite[] = [];
  for (const site of state.customSites) {
    if (await api.permissionsContains(originPatternFor(site))) grantedSites.push(site);
  }
  if (grantedSites.length !== state.customSites.length) {
    await api.storageSet({ schemaVersion: 1, customSites: grantedSites });
  }

  const matches = builtInPatterns();
  const desired = [
    registration(BUILTIN_ISOLATED_ID, matches, "content/bootstrap.js", "ISOLATED", true),
    registration(BUILTIN_MAIN_ID, matches, "content/route-bridge.js", "MAIN", true)
  ];
  for (const site of grantedSites) {
    desired.push(...(await customRegistrationsForOrigin(originPatternFor(site))));
  }

  const existing = await api.getRegisteredContentScripts();
  const desiredById = new Map(desired.map((script) => [script.id, script]));
  const stale = existing.filter(
    (script) => script.id.startsWith("afb_") && !desiredById.has(script.id)
  );
  if (stale.length) await api.unregisterContentScripts(stale.map((script) => script.id));

  const existingById = new Map(existing.map((script) => [script.id, script]));
  const missing = desired.filter((script) => !existingById.has(script.id));
  const changed = desired.filter((script) => {
    const current = existingById.get(script.id);
    return current ? !sameRegistration(current, script) : false;
  });
  if (changed.length) await api.updateContentScripts(changed);
  if (missing.length) await api.registerContentScripts(missing);
  return { customSites: grantedSites };
}

function registration(
  id: string,
  matches: string[],
  file: string,
  world: "ISOLATED" | "MAIN",
  allFrames: boolean
): RegisteredScriptConfig {
  return {
    id,
    matches,
    js: [file],
    runAt: "document_start",
    world,
    allFrames,
    persistAcrossSessions: true
  };
}

function sameRegistration(a: RegisteredScriptConfig, b: RegisteredScriptConfig): boolean {
  return (
    JSON.stringify({ ...a, matches: [...a.matches].sort() }) ===
    JSON.stringify({ ...b, matches: [...b.matches].sort() })
  );
}
