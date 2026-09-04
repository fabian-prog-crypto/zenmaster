import { beforeEach, describe, expect, it } from "vitest";
import { adapterRegistry } from "../../src/adapters/index.js";
import { Blocker } from "../../src/content/blocker.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";

describe("Pornhub adapter regressions", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = `
      <head></head>
      <body>
        <main id="vpContentContainer">
          <section class="video-player" data-player><video controls></video></section>
          <aside id="hd-rightColVideoPage">
            <ul class="videos thumb-list--sidebar">
              <li class="pcVideoListItem"><a href="/view_video.php?viewkey=one">[one]</a></li>
              <li class="pcVideoListItem"><a href="/view_video.php?viewkey=two">[two]</a></li>
            </ul>
          </aside>
        </main>`;
  });

  it("recognizes the German hostname as the Pornhub adapter", () => {
    expect(adapterRegistry.getAdapterForHostname("de.pornhub.org")?.id).toBe("pornhub");
  });

  it("hides the two-video watch sidebar without hiding the selected player", () => {
    const adapter = adapterRegistry.getAdapterForHostname("www.pornhub.com")!;
    const protection = new ProtectionRegistry();
    for (const selector of adapter.protectedSelectors.watch ?? []) {
      for (const node of document.querySelectorAll(selector)) protection.register(node);
    }
    const blocker = new Blocker(adapter.id, document, protection);
    blocker.applyRules(document, adapter.globalRecommendationSelectors);

    expect(
      document.querySelector("#hd-rightColVideoPage")?.getAttribute("data-afb-hidden")
    ).toEqual(expect.stringContaining("pornhub:recommendation"));
    expect(document.querySelector(".video-player")!.closest("[data-afb-hidden]")).toBeNull();
  });

  it("hides the current two-card rail and under-player playlist recommendations", () => {
    document.documentElement.innerHTML = `<head></head><body>
      <main id="vpContentContainer">
        <section class="video-player" data-player><video controls></video></section>
        <div class="topSectionGrid">
          <div class="sideColumn original">
            <div class="extraRelatedVid latestThumbDesign">
              <ul>
                <li class="pcVideoListItem"><a href="/view_video.php?viewkey=one"></a></li>
                <li class="pcVideoListItem"><a href="/view_video.php?viewkey=two"></a></li>
              </ul>
            </div>
          </div>
        </div>
        <div id="under-player-playlists" class="sectionWrapper video-wrapper original">
          <ul id="videoPlayList" class="videos user-playlist">
            <li><a href="/view_video.php?viewkey=three"></a><a href="/playlist/one"></a></li>
            <li><a href="/view_video.php?viewkey=four"></a><a href="/playlist/two"></a></li>
          </ul>
        </div>
      </main>
    </body>`;
    const adapter = adapterRegistry.getAdapterForHostname("de.pornhub.org")!;
    const protection = new ProtectionRegistry();
    for (const selector of adapter.protectedSelectors.watch ?? []) {
      for (const node of document.querySelectorAll(selector)) protection.register(node);
    }
    const blocker = new Blocker(adapter.id, document, protection);
    blocker.applyRules(document, adapter.globalRecommendationSelectors);

    expect(document.querySelector(".extraRelatedVid")?.hasAttribute("data-afb-hidden")).toBe(true);
    expect(document.querySelector("#under-player-playlists")?.hasAttribute("data-afb-hidden")).toBe(
      true
    );
    expect(document.querySelector(".video-player")!.closest("[data-afb-hidden]")).toBeNull();
  });
});
