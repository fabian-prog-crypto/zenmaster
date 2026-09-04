import { beforeEach, describe, expect, it } from "vitest";
import { adapterRegistry } from "../../src/adapters/index.js";
import { createContentKernel } from "../../src/content/bootstrap.js";
import { ROUTE_EVENT } from "../../src/content/route-events.js";
import type { PageStatus } from "../../src/shared/status.js";

describe("content kernel", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("protects the selected player and hides known recommendations", () => {
    document.body.innerHTML = `<main>
      <div class="video-player"><video controls></video></div>
      <aside class="related-videos" aria-label="Related">
        <li class="pcVideoListItem"><a href="https://pornhub.com/video/1"></a><a href="https://pornhub.com/video/1"></a></li>
        <li class="pcVideoListItem"><a href="https://pornhub.com/video/2"></a><a href="https://pornhub.com/video/2"></a></li>
      </aside>
    </main>`;
    const updates: PageStatus[] = [];
    const kernel = createContentKernel({
      page: document,
      url: new URL("https://pornhub.com/video/item"),
      registry: adapterRegistry,
      observe: false,
      inFrame: false,
      onStatusChange: (status) => updates.push(status)
    });
    kernel.start();
    expect(document.querySelector(".video-player")!.closest("[data-afb-hidden]")).toBeNull();
    expect(document.querySelector(".related-videos")!.hasAttribute("data-afb-hidden")).toBe(true);
    expect(kernel.getStatus()).toMatchObject({
      state: "active-known",
      pageKind: "watch",
      blockedCount: 1,
      blockedVideoCount: 2
    });
    expect(updates.at(-1)?.blockedVideoCount).toBe(2);
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
    expect(kernel.getStatus()).toMatchObject({
      state: "active-generic",
      blockedCount: 1,
      blockedVideoCount: 4
    });
  });

  it("runs structural blocking on a healthy known NoodleMagazine home page", () => {
    document.body.innerHTML = `<header><form role="search"><input type="search"></form></header>
      <main><section data-layout="rail">
        <div class="entry"><a href="/a1"><img alt=""></a></div>
        <div class="entry"><a href="/a2"><img alt=""></a></div>
        <div class="entry"><a href="/a3"><img alt=""></a></div>
      </section></main>`;
    const kernel = createContentKernel({
      page: document,
      url: new URL("https://noodlemagazine.com/"),
      registry: adapterRegistry,
      observe: false,
      inFrame: false
    });

    kernel.start();

    expect(document.querySelector("[data-layout='rail']")?.hasAttribute("data-afb-hidden")).toBe(
      true
    );
    expect(document.querySelector("form[role='search']")?.closest("[data-afb-hidden]")).toBeNull();
    expect(kernel.getStatus()).toMatchObject({
      state: "active-known",
      adapterId: "noodlemagazine",
      pageKind: "home",
      blockedVideoCount: 3
    });
  });

  it("preserves structurally identical NoodleMagazine search results", () => {
    document.body.innerHTML = `<header><form role="search"><input type="search"></form></header>
      <main id="search-results"><section data-layout="rail">
        <div class="entry"><a href="/a1"><img alt=""></a></div>
        <div class="entry"><a href="/a2"><img alt=""></a></div>
        <div class="entry"><a href="/a3"><img alt=""></a></div>
      </section></main>`;
    const kernel = createContentKernel({
      page: document,
      url: new URL("https://noodlemagazine.com/search?q=fixture"),
      registry: adapterRegistry,
      observe: false,
      inFrame: false
    });

    kernel.start();

    expect(document.querySelector("#search-results")?.closest("[data-afb-hidden]")).toBeNull();
    expect(kernel.getStatus().blockedVideoCount).toBe(0);
  });

  it("hides an unlabeled NoodleMagazine watch rail without hiding the player", () => {
    document.body.innerHTML = `<main>
      <div class="video-player"><video controls></video></div>
      <section data-layout="rail">
        <div class="entry"><a href="/a1"><img alt=""></a></div>
        <div class="entry"><a href="/a2"><img alt=""></a></div>
        <div class="entry"><a href="/a3"><img alt=""></a></div>
      </section>
    </main>`;
    const kernel = createContentKernel({
      page: document,
      url: new URL("https://noodlemagazine.com/video/fixture"),
      registry: adapterRegistry,
      observe: false,
      inFrame: false
    });

    kernel.start();

    expect(document.querySelector("[data-layout='rail']")?.hasAttribute("data-afb-hidden")).toBe(
      true
    );
    expect(document.querySelector(".video-player")?.closest("[data-afb-hidden]")).toBeNull();
  });

  it("replaces the count after a single-page route change", async () => {
    history.replaceState({}, "", "/video/with-recommendations");
    document.body.innerHTML = `<main>
      <div class="video-player"><video controls></video></div>
      <aside class="related-videos"><li><a href="/video/one"></a></li><li><a href="/video/two"></a></li></aside>
    </main>`;
    const updates: PageStatus[] = [];
    const kernel = createContentKernel({
      page: document,
      url: () => new URL(location.href),
      registry: adapterRegistry,
      observe: true,
      inFrame: false,
      onStatusChange: (status) => updates.push(status)
    });
    kernel.start();
    expect(updates.at(-1)?.blockedVideoCount).toBe(2);

    document.body.innerHTML = `<main><div class="video-player"><video controls></video></div></main>`;
    history.pushState({}, "", "/video/without-recommendations");
    window.dispatchEvent(new Event(ROUTE_EVENT));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(updates.at(-1)?.blockedVideoCount).toBe(0);
    kernel.stop();
  });
});
