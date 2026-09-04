import { describe, expect, it, vi } from "vitest";
import { ROUTE_EVENT, installRouteBridge } from "../../src/content/route-bridge.js";
import { RouteController } from "../../src/content/route-controller.js";

describe("route lifecycle", () => {
  it("emits for history methods and reinitializes once per changed URL", async () => {
    history.replaceState({}, "", "/start");
    const disposeBridge = installRouteBridge(window);
    const reinitialize = vi.fn();
    const controller = new RouteController(window, reinitialize);
    controller.start();
    history.pushState({ secret: "not-read" }, "", "/next");
    window.dispatchEvent(new Event(ROUTE_EVENT));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reinitialize).toHaveBeenCalledOnce();
    controller.stop();
    disposeBridge();
  });
});
