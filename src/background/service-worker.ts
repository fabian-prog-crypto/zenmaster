import catalogJson from "../adapters/catalog.json" with { type: "json" };
import { RULESET_VERSION } from "../adapters/ruleset-version.js";
import type { CatalogEntry } from "../adapters/types.js";
import { parseMessage } from "../shared/messages.js";
import { parseStoredState } from "../shared/storage.js";
import { getBadgeTabId, setTabBadge } from "./badge.js";
import { createChromeApi } from "./chrome-api.js";
import { addCustomSite, removeCustomSite } from "./permissions.js";
import { reconcileRegistrations } from "./registrations.js";

const api = createChromeApi();
const catalog = catalogJson as readonly CatalogEntry[];

function isPrivilegedSender(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id) return false;
  const prefix = `chrome-extension://${chrome.runtime.id}/`;
  return sender.url?.startsWith(prefix) === true;
}

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  const parsed = parseMessage(raw);
  if (!parsed.ok) {
    sendResponse({ ok: false, error: "invalid-message" });
    return false;
  }
  const request = parsed.value;
  if (request.type === "SET_TAB_BADGE") {
    const tabId = getBadgeTabId(sender, chrome.runtime.id);
    if (tabId === undefined) {
      sendResponse({ ok: false, error: "invalid-message" });
      return false;
    }
    void setTabBadge(api, tabId, request.count)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false, error: "operation-failed" }));
    return true;
  }
  if (!isPrivilegedSender(sender)) {
    sendResponse({ ok: false, error: "invalid-message" });
    return false;
  }
  if (request.type === "GET_PAGE_STATUS") return false;

  let result: Promise<unknown>;
  if (request.type === "ADD_CURRENT_SITE") {
    // This call must occur synchronously in the message turn to retain the popup's user gesture.
    result = addCustomSite(api, { tabId: request.tabId, origin: request.origin });
  } else if (request.type === "REMOVE_CUSTOM_SITE") {
    result = removeCustomSite(api, { scheme: request.scheme, hostname: request.hostname });
  } else {
    result = api.storageGet().then((rawState) => ({
      ok: true,
      model: {
        catalog,
        customSites: parseStoredState(rawState).customSites,
        extensionVersion: chrome.runtime.getManifest().version,
        rulesetVersion: RULESET_VERSION
      }
    }));
  }
  result.then(sendResponse).catch(() => sendResponse({ ok: false, error: "operation-failed" }));
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  void reconcileRegistrations(api);
});
chrome.runtime.onStartup.addListener(() => {
  void reconcileRegistrations(api);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") void setTabBadge(api, tabId, 0).catch(() => undefined);
});

void reconcileRegistrations(api);
