import { beforeEach, describe, expect, it } from "vitest";
import { adapterRegistry } from "../../src/adapters/index.js";
import { createContentKernel } from "../../src/content/bootstrap.js";

describe("content kernel", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("protects the selected player and hides known recommendations", () => {
    document.body.innerHTML = `<main><div class="video-player"><video controls></video></div><aside class="related-videos" aria-label="Related"><a href="/video/1"></a><a href="/video/2"></a><a href="/video/3"></a><a href="/video/4"></a></aside></main>`;
    const kernel = createContentKernel({
      page: document,
      url: new URL("https://pornhub.com/video/item"),
      registry: adapterRegistry,
      observe: false,
      inFrame: false
    });
    kernel.start();
    expect(document.querySelector(".video-player")!.closest("[data-afb-hidden]")).toBeNull();
    expect(document.querySelector(".related-videos")!.hasAttribute("data-afb-hidden")).toBe(true);
    expect(kernel.getStatus()).toMatchObject({
      state: "active-known",
      pageKind: "watch",
      blockedCount: 1
    });
  });

  it("runs conservative generic rules on a user-added host", () => {
    document.body.innerHTML = `<section aria-label="Recommended"><h2>Recommended</h2><a href="/video/1"></a><a href="/video/2"></a><a href="/video/3"></a><a href="/video/4"></a></section>`;
    const kernel = createContentKernel({
      page: document,
      url: new URL("https://custom.test/other"),
      registry: adapterRegistry,
      observe: false,
      inFrame: false
    });
    kernel.start();
    expect(document.querySelector("section")!.hasAttribute("data-afb-hidden")).toBe(true);
    expect(kernel.getStatus()).toMatchObject({ state: "active-generic", blockedCount: 1 });
  });
});
