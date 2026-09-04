import { beforeEach, describe, expect, it } from "vitest";
import { renderPopup } from "../../src/popup/popup.js";

describe("popup", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it("renders protected state without an escape hatch", () => {
    renderPopup(document.querySelector("#app")!, {
      state: "active-known",
      adapterId: "pornhub",
      pageKind: "watch",
      blockedCount: 4,
      blockedVideoCount: 4,
      autoAdvanceBlocked: true
    });
    expect(document.body.textContent).toContain("Zen Master is active");
    expect(document.body.textContent).toContain("Zen Master");
    expect(document.body.textContent).toContain("🧘");
    expect(document.body.textContent).toContain("4 video recommendations hidden");
    expect(document.body.textContent).not.toContain("recommendation areas");
    expect(document.querySelector("[data-action='add-site']")).toBeNull();
    expect(document.body.textContent).not.toMatch(/pause|reveal|disable/i);
  });

  it("offers the add action only on eligible unsupported pages", () => {
    renderPopup(document.querySelector("#app")!, {
      state: "unsupported",
      blockedCount: 0,
      blockedVideoCount: 0,
      autoAdvanceBlocked: false
    });
    expect(document.querySelector("[data-action='add-site']")?.textContent).toBe(
      "Block recommendations on this site"
    );
  });
});
