import { describe, expect, it } from "vitest";
import {
  BADGE_COLOR,
  formatBadgeCount,
  getBadgeTabId,
  setTabBadge
} from "../../src/background/badge.js";
import { createChromeFake } from "../helpers/chrome-fake.js";

describe("toolbar badge", () => {
  it("is blank at zero, exact through 99, and capped above 99", () => {
    expect([0, 1, 99, 100].map(formatBadgeCount)).toEqual(["", "1", "99", "99+"]);
  });

  it("sets tab-scoped text and background color", async () => {
    const api = createChromeFake();
    await setTabBadge(api, 7, 12);
    expect(api.calls).toContain("action.badgeText:7:12");
    expect(api.calls).toContain(`action.badgeColor:7:${BADGE_COLOR}`);
  });

  it("accepts only top-frame HTTP(S) content senders from this extension", () => {
    const valid = {
      id: "extension-id",
      frameId: 0,
      url: "https://example.test/watch/one",
      tab: { id: 9 }
    } as chrome.runtime.MessageSender;
    expect(getBadgeTabId(valid, "extension-id")).toBe(9);
    expect(getBadgeTabId({ ...valid, id: "other" }, "extension-id")).toBeUndefined();
    expect(getBadgeTabId({ ...valid, frameId: 2 }, "extension-id")).toBeUndefined();
    expect(
      getBadgeTabId({ ...valid, url: "chrome-extension://extension-id/popup.html" }, "extension-id")
    ).toBeUndefined();
    expect(
      getBadgeTabId({ ...valid, tab: {} } as chrome.runtime.MessageSender, "extension-id")
    ).toBeUndefined();
  });
});
