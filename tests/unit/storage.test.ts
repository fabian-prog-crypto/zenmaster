import { describe, expect, it } from "vitest";
import { normalizeCustomSite, parseStoredState } from "../../src/shared/storage.js";

describe("custom site storage", () => {
  it("normalizes an HTTP(S) URL to scheme and exact hostname only", () => {
    expect(normalizeCustomSite("HTTPS://WWW.Example.COM/watch?q=secret#x")).toEqual({
      scheme: "https",
      hostname: "www.example.com",
      originPattern: "https://www.example.com/*"
    });
  });

  it("rejects unsafe schemes and credentials", () => {
    expect(() => normalizeCustomSite("chrome://extensions")).toThrow("Unsupported URL scheme");
    expect(() => normalizeCustomSite("https://user:pass@example.com/")).toThrow(
      "Credentials are not allowed"
    );
  });

  it("defaults corrupt data and deduplicates by scheme plus hostname", () => {
    expect(parseStoredState(null)).toEqual({ schemaVersion: 1, customSites: [] });
    expect(
      parseStoredState({
        schemaVersion: 1,
        customSites: [
          { scheme: "https", hostname: "EXAMPLE.COM", addedAt: 5 },
          { scheme: "https", hostname: "example.com", addedAt: 8 },
          { scheme: "ftp", hostname: "bad.example", addedAt: 1 }
        ]
      })
    ).toEqual({
      schemaVersion: 1,
      customSites: [{ scheme: "https", hostname: "example.com", addedAt: 5 }]
    });
  });
});
