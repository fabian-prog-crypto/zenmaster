import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const fixturesRoot = path.join(root, "tests/fixtures");
const catalog = JSON.parse(await readFile(path.join(root, "src/adapters/catalog.json"), "utf8"));
const fixtureKinds = [
  {
    name: "home",
    path: "/",
    html: `<main><h1>[interface]</h1><section class="video-grid" data-afb-expect="hide"><a href="/video/item-1">[text-1]</a><a href="/video/item-2">[text-2]</a><a href="/video/item-3">[text-3]</a><a href="/video/item-4">[text-4]</a></section></main>`
  },
  {
    name: "listing",
    path: "/category/afb-fixture",
    html: `<main><h1>Popular</h1><div class="list-videos" data-afb-expect="hide"><a href="/video/item-1">[text-1]</a><a href="/video/item-2">[text-2]</a><a href="/video/item-3">[text-3]</a><a href="/video/item-4">[text-4]</a></div></main>`
  },
  {
    name: "watch",
    path: "/video/afb-fixture",
    html: `<main><div class="video-player" data-afb-expect="player"><video controls></video></div><aside class="related-videos" aria-label="Related" data-afb-expect="hide"><a href="/video/item-1">[text-1]</a><a href="/video/item-2">[text-2]</a><a href="/video/item-3">[text-3]</a><a href="/video/item-4">[text-4]</a></aside><button class="autoplay-next" aria-label="Autoplay next" aria-checked="true">Autoplay</button></main>`
  },
  {
    name: "search",
    path: "/search?q=afb-fixture",
    html: `<form role="search"><input type="search" value=""></form><main class="search-results" aria-label="Search results" data-afb-expect="preserve"><a href="/video/item-1">[text-1]</a><a href="/video/item-2">[text-2]</a><a href="/video/item-3">[text-3]</a><a href="/video/item-4">[text-4]</a></main>`
  }
];

await rm(fixturesRoot, { recursive: true, force: true });
for (const entry of catalog) {
  const directory = path.join(fixturesRoot, entry.id);
  await mkdir(directory, { recursive: true });
  for (const fixture of fixtureKinds) {
    const document = `<!doctype html><html><head><meta charset="utf-8"></head><body data-adapter="${entry.id}">${fixture.html}</body></html>\n`;
    const metadata = {
      adapterId: entry.id,
      pageKind: fixture.name === "listing" ? "blocked-listing" : fixture.name,
      url: `https://${entry.primaryHostname}${fixture.path}`,
      liveVerified: false
    };
    await writeFile(path.join(directory, `${fixture.name}.html`), document);
    await writeFile(
      path.join(directory, `${fixture.name}.meta.json`),
      `${JSON.stringify(metadata, null, 2)}\n`
    );
  }
}

const genericDirectory = path.join(fixturesRoot, "generic");
await mkdir(genericDirectory, { recursive: true });
const genericCorpus = Array.from({ length: 100 }, (_, index) => {
  const positive = index < 50;
  return {
    id: `case-${String(index + 1).padStart(3, "0")}`,
    expected: positive ? "hide" : "preserve",
    pageKind: positive ? "unknown" : "search",
    html: positive
      ? `<section aria-label="Recommended"><h2>Recommended</h2><a href="/video/1"></a><a href="/video/2"></a><a href="/video/3"></a><a href="/video/4"></a></section>`
      : `<form role="search"><input type="search"></form><main class="search-results" aria-label="Search results"><a href="/video/1"></a><a href="/video/2"></a><a href="/video/3"></a><a href="/video/4"></a></main>`
  };
});
await writeFile(
  path.join(genericDirectory, "corpus.json"),
  `${JSON.stringify(genericCorpus, null, 2)}\n`
);

console.log(`Generated ${catalog.length * fixtureKinds.length} sanitized structural fixtures.`);
