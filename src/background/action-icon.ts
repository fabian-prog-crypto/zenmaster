import type { ChromeApi } from "./chrome-api.js";

export const ACTION_ICON_PATHS = {
  16: "icons/zen-master-16.png",
  32: "icons/zen-master-32.png",
  48: "icons/zen-master-48.png",
  128: "icons/zen-master-128.png"
} as const satisfies Record<string, string>;

export function refreshActionIcon(api: ChromeApi): Promise<void> {
  return api.setActionIcon(ACTION_ICON_PATHS);
}
