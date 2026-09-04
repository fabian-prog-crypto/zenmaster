import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutoAdvanceController } from "../../src/content/auto-advance.js";

describe("auto-advance controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("turns off only a confirmed on-state control", () => {
    document.body.innerHTML = `<video autoplay controls></video><button id="next" aria-checked="true"></button>`;
    const button = document.querySelector("button") as HTMLButtonElement;
    const click = vi.spyOn(button, "click");
    const video = document.querySelector("video")!;
    const before = video.autoplay;
    const result = new AutoAdvanceController(document).apply({
      type: "toggle-off",
      selector: "#next",
      stateAttribute: "aria-checked",
      onValue: "true"
    });
    expect(click).toHaveBeenCalledOnce();
    expect(video.autoplay).toBe(before);
    expect(result.blocked).toBe(true);
  });

  it("hides a confirmed countdown without changing current playback", () => {
    document.body.innerHTML = `<video controls></video><div class="countdown"></div>`;
    const result = new AutoAdvanceController(document).apply({
      type: "hide-countdown",
      selector: ".countdown"
    });
    expect(document.querySelector(".countdown")!.hasAttribute("data-afb-hidden")).toBe(true);
    expect(result).toMatchObject({ supported: true, blocked: true, errors: [] });
  });
});
