import { describe, expect, it } from "vitest";
import catalog from "../../src/adapters/catalog.json" with { type: "json" };
import { RULESET_VERSION } from "../../src/adapters/ruleset-version.js";

const expectedIds = [
  "pornhub",
  "xvideos",
  "xnxx",
  "xhamster",
  "youporn",
  "redtube",
  "tube8",
  "spankbang",
  "txxx",
  "eporner",
  "noodlemagazine",
  "mat6tube",
  "tukif",
  "hclips",
  "hqporner",
  "porntrex",
  "upornia",
  "beeg",
  "thumbzilla",
  "pornone",
  "xgroovy",
  "heavyfetish",
  "pornditt",
  "pornzog",
  "hdzog",
  "thegay",
  "ooxxx",
  "hotmovs",
  "vjav",
  "pornl",
  "voyeurhit",
  "manysex",
  "tubepornclassic",
  "shemalez",
  "fourkporn",
  "crazyporn",
  "love4porn",
  "hoes",
  "motherless",
  "theyarehuge",
  "trannyone",
  "ahme",
  "ashemale",
  "bdsmone",
  "bemyhole",
  "gaygo",
  "gayxo",
  "shemalepub",
  "sunporno",
  "yesvids"
] as const;

describe("launch catalog", () => {
  it("contains the approved 50 unique adapters in stable order", () => {
    expect(catalog.map((entry) => entry.id)).toEqual(expectedIds);
    const roots = catalog.flatMap((entry) => entry.domainRoots);
    expect(new Set(roots).size).toBe(roots.length);
    expect(catalog.every((entry) => entry.domainRoots.includes(entry.primaryHostname))).toBe(true);
  });

  it("starts with packaged ruleset version one", () => {
    expect(RULESET_VERSION).toBe(1);
  });
});
