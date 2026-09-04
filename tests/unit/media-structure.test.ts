import { beforeEach, describe, expect, it } from "vitest";
import { findMediaCardGroups, isLikelyMediaAnchor } from "../../src/content/media-structure.js";

describe("media structure recognition", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("recognizes repeated thumbnail cards without video words in classes or URLs", () => {
    document.body.innerHTML = `<section data-layout="rail">
      <div class="entry"><a href="/a1"><img alt=""></a><span class="duration">01:00</span></div>
      <div class="entry"><a href="/a2"><img alt=""></a><span class="duration">02:00</span></div>
      <div class="entry"><a href="/a3"><img alt=""></a><span class="duration">03:00</span></div>
    </section>`;

    const groups = findMediaCardGroups(document);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.container).toBe(document.querySelector("section"));
    expect(groups[0]?.cards).toHaveLength(3);
  });

  it("does not treat thumbnail navigation as a media-card group", () => {
    document.body.innerHTML = `<nav>
      <a href="/a"><img alt=""></a>
      <a href="/b"><img alt=""></a>
      <a href="/c"><img alt=""></a>
    </nav>`;

    expect(findMediaCardGroups(document)).toEqual([]);
  });

  it("recognizes a thumbnail slug and rejects an ordinary profile link", () => {
    document.body.innerHTML = `<a id="thumb" href="/opaque"><img alt=""></a>
      <a id="profile" href="/profile/example">profile</a>`;

    expect(isLikelyMediaAnchor(document.querySelector("#thumb")!)).toBe(true);
    expect(isLikelyMediaAnchor(document.querySelector("#profile")!)).toBe(false);
  });
});
