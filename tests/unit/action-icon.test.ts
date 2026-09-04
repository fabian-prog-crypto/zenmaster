import { describe, expect, it } from "vitest";
import { ACTION_ICON_PATHS, refreshActionIcon } from "../../src/background/action-icon.js";
import { createChromeFake } from "../helpers/chrome-fake.js";

describe("action icon", () => {
  it("explicitly refreshes every toolbar icon size", async () => {
    const api = createChromeFake();
    await refreshActionIcon(api);
    expect(ACTION_ICON_PATHS).toEqual({
      16: "icons/zen-master-16.png",
      32: "icons/zen-master-32.png",
      48: "icons/zen-master-48.png",
      128: "icons/zen-master-128.png"
    });
    expect(api.actionIconPaths).toEqual(ACTION_ICON_PATHS);
    expect(api.calls).toContain("action.icon");
  });
});
