import type { CatalogEntry } from "../adapters/types.js";
import type { StoredCustomSite } from "../shared/storage.js";

export interface SettingsModel {
  catalog: readonly CatalogEntry[];
  customSites: readonly StoredCustomSite[];
  extensionVersion: string;
  rulesetVersion: number;
}

interface SettingsActions {
  onRemove?: (site: StoredCustomSite) => void | Promise<void>;
}

export function renderSettings(
  root: Element,
  model: SettingsModel,
  actions: SettingsActions = {}
): void {
  root.replaceChildren();
  const header = el("header", "hero");
  header.append(
    el("p", "eyebrow", "🧘 Zen Master"),
    el("h1", "", "Zen Master is always active."),
    el(
      "p",
      "lede",
      "Recommendation feeds disappear. Search and the video you deliberately opened remain."
    ),
    el("p", "version", `Extension ${model.extensionVersion} · Ruleset ${model.rulesetVersion}`)
  );

  const custom = el("section", "panel");
  custom.append(el("h2", "", "Added by you"));
  const customIntro = el("p", "muted", "Only the scheme and hostname are stored on this device.");
  custom.append(customIntro);
  const customList = el("ul", "site-list");
  if (!model.customSites.length) customList.append(el("li", "empty", "No additional sites yet."));
  for (const site of [...model.customSites].sort((a, b) => a.addedAt - b.addedAt)) {
    const item = el("li", "site-row");
    const name = el("span", "site-name", `${site.scheme}://${site.hostname}`);
    const remove = el("button", "remove", "Remove");
    remove.setAttribute("data-action", "remove-site");
    remove.addEventListener("click", () => void actions.onRemove?.(site));
    item.append(name, remove);
    customList.append(item);
  }
  custom.append(customList);

  const builtIn = el("section", "panel");
  const builtHeader = el("div", "section-heading");
  builtHeader.append(el("h2", "", "Built-in coverage"), el("span", "pill", "50 sites"));
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Filter supported sites";
  search.setAttribute("aria-label", "Filter supported sites");
  const list = el("ul", "site-list built-list");
  const renderBuiltIns = (query = "") => {
    list.replaceChildren();
    for (const site of model.catalog.filter((entry) =>
      `${entry.displayName} ${entry.primaryHostname} ${entry.aliases.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )) {
      const item = el("li", "site-row");
      item.setAttribute("data-built-in", site.id);
      const text = el("span", "site-name", site.displayName);
      const host = el("span", "host", site.primaryHostname);
      item.append(text, host);
      list.append(item);
    }
  };
  search.addEventListener("input", () => renderBuiltIns(search.value));
  renderBuiltIns();
  builtIn.append(builtHeader, search, list);

  const privacy = el("section", "privacy");
  privacy.append(
    el("h2", "", "Private by construction"),
    el(
      "p",
      "muted",
      "No telemetry, cloud sync, browsing history, or extension-owned network requests."
    )
  );
  const live = el("p", "sr-only");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("data-live", "");
  root.append(header, custom, builtIn, privacy, live);
}

async function initializeSettings(): Promise<void> {
  const root = document.querySelector("#app");
  if (!root) return;
  const response = (await chrome.runtime.sendMessage({ version: 1, type: "LIST_SETTINGS" })) as {
    ok: boolean;
    model?: SettingsModel;
  };
  if (!response.ok || !response.model) return;
  const model = response.model;
  const render = () =>
    renderSettings(root, model, {
      onRemove: async (site) => {
        const result = (await chrome.runtime.sendMessage({
          version: 1,
          type: "REMOVE_CUSTOM_SITE",
          scheme: site.scheme,
          hostname: site.hostname
        })) as { ok: boolean };
        if (!result.ok) return;
        const index = model.customSites.findIndex(
          (candidate) => candidate.scheme === site.scheme && candidate.hostname === site.hostname
        );
        if (index >= 0) (model.customSites as StoredCustomSite[]).splice(index, 1);
        render();
        const live = root.querySelector<HTMLElement>("[data-live]");
        if (live) live.textContent = "Site removed. Reload open pages from that site.";
      }
    });
  render();
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) void initializeSettings();
