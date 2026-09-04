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
});
