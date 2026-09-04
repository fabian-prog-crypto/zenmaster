import type { ChromeApi } from "./chrome-api.js";

export const BADGE_COLOR = "#9a5b2f";

export function formatBadgeCount(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

export async function setTabBadge(api: ChromeApi, tabId: number, count: number): Promise<void> {
  await Promise.all([
    api.setBadgeText(tabId, formatBadgeCount(count)),
    api.setBadgeBackgroundColor(tabId, BADGE_COLOR)
  ]);
}

export function getBadgeTabId(
  sender: chrome.runtime.MessageSender,
  extensionId: string
): number | undefined {
  const tabId = sender.tab?.id;
  if (
    sender.id !== extensionId ||
    sender.frameId !== 0 ||
    typeof tabId !== "number" ||
    !Number.isInteger(tabId) ||
    !isWebUrl(sender.url)
  ) {
    return undefined;
  }
  return tabId;
}

function isWebUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}
