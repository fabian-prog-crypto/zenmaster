import { beforeEach, describe, expect, it } from "vitest";
import { detectCreatorPaths } from "../../src/content/creator-guard.js";
import { ProtectionRegistry } from "../../src/content/protection-registry.js";

describe("creator path detection", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("selects uploader identity and more-from modules without selecting the player", () => {
    document.body.innerHTML = `<main>
      <div class="video-player"><video controls></video></div>
      <div class="uploader-info"><a href="/profile/fixture">[creator]</a><button>Follow</button></div>
      <section aria-label="More from this account">
        <a href="/v/1"><span data-thumbnail></span></a>
        <a href="/v/2"><span data-thumbnail></span></a>
        <a href="/v/3"><span data-thumbnail></span></a>
      </section>
    </main>`;
    const protection = new ProtectionRegistry();
    const player = document.querySelector("video")!;
    protection.register(player.closest(".video-player"));

    const result = detectCreatorPaths(document, {
      pageKind: "watch",
      protection,
      primaryPlayer: player
    });

    expect(result.containers).toContain(document.querySelector(".uploader-info"));
    expect(result.containers).toContain(document.querySelector("section"));
    expect(result.containers.some((node) => node.contains(player))).toBe(false);
  });

  it("selects residual creator links only inside watch metadata", () => {
    document.body.innerHTML = `<nav><a id="nav" href="/channels">Channels</a></nav>
      <main><div class="video-player"><video></video></div>
        <div class="video-metadata"><a id="creator" href="/profile/fixture">[creator]</a></div>
      </main>`;
    const result = detectCreatorPaths(document, {
      pageKind: "watch",
      protection: new ProtectionRegistry(),
      primaryPlayer: document.querySelector("video")!
    });

    expect(result.links).toEqual([document.querySelector("#creator")]);
    expect(result.links).not.toContain(document.querySelector("#nav"));
  });

  it("never selects creator elements inside a protected search root", () => {
    document.body.innerHTML = `<main id="search-results">
      <div class="uploader-info"><a href="/profile/fixture">[creator]</a></div>
    </main>`;
    const protection = new ProtectionRegistry();
    protection.register(document.querySelector("#search-results"));

    expect(detectCreatorPaths(document, { pageKind: "watch", protection }).containers).toEqual([]);
  });
});
