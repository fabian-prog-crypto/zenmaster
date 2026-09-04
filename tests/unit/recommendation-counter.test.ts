import { beforeEach, describe, expect, it } from "vitest";
import { countRecommendationCards } from "../../src/content/recommendation-counter.js";

describe("recommendation card counter", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("counts two cards rather than their duplicate links", () => {
    document.body.innerHTML = `<aside data-afb-hidden>
      <li class="pcVideoListItem">
        <a href="https://example.test/view_video.php?viewkey=one">image</a>
        <a href="https://example.test/view_video.php?viewkey=one">title</a>
      </li>
      <li class="pcVideoListItem">
        <a href="https://example.test/view_video.php?viewkey=two">image</a>
        <a href="https://example.test/view_video.php?viewkey=two">title</a>
      </li>
    </aside>`;

    expect(countRecommendationCards([document.querySelector("aside")!], [".pcVideoListItem"])).toBe(
      2
    );
  });

  it("counts an unknown linked root once and ignores it after disconnection", () => {
    const root = document.createElement("article");
    root.innerHTML = `<a href="https://example.test/watch/item">video</a>`;
    document.body.append(root);

    expect(countRecommendationCards([root], [".missing"])).toBe(1);
    root.remove();
    expect(countRecommendationCards([root], [".missing"])).toBe(0);
  });

  it("does not count ordinary links inside a hidden root", () => {
    document.body.innerHTML = `<aside data-afb-hidden><a href="https://example.test/profile/one">profile</a></aside>`;
    expect(countRecommendationCards([document.querySelector("aside")!], ["article"])).toBe(0);
  });

  it("counts opaque repeated thumbnail cards once each", () => {
    document.body.innerHTML = `<section data-afb-hidden data-layout="rail">
      <div class="entry"><a href="/a1"><img alt=""></a><a href="/a1">[title]</a></div>
      <div class="entry"><a href="/a2"><img alt=""></a><a href="/a2">[title]</a></div>
      <div class="entry"><a href="/a3"><img alt=""></a><a href="/a3">[title]</a></div>
    </section>`;

    expect(countRecommendationCards([document.querySelector("section")!], [".missing"])).toBe(3);
  });
});
