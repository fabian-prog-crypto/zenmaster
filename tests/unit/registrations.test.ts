import { describe, expect, it } from "vitest";
import {
  reconcileRegistrations,
  registrationIdsForOrigin
} from "../../src/background/registrations.js";
import { createChromeFake } from "../helpers/chrome-fake.js";

describe("content script registrations", () => {
  it("derives private deterministic IDs from scheme and host", async () => {
    const first = await registrationIdsForOrigin("https://www.example.com/*");
    const again = await registrationIdsForOrigin("https://www.example.com/*");
    const other = await registrationIdsForOrigin("http://www.example.com/*");
    expect(first).toEqual(again);
    expect(first).not.toEqual(other);
    expect(first.isolated).toMatch(/^afb_custom_isolated_[a-f0-9]{40}$/);
    expect(JSON.stringify(first)).not.toContain("example");
  });

  it("reconciles built-ins and only granted custom origins", async () => {
    const api = createChromeFake();
    const pattern = "https://example.com/*";
    api.granted.add(pattern);
    api.setStored({
      schemaVersion: 1,
      customSites: [
        { scheme: "https", hostname: "example.com", addedAt: 1 },
        { scheme: "https", hostname: "revoked.test", addedAt: 2 }
      ]
    });
    const result = await reconcileRegistrations(api);
    expect(result.customSites).toHaveLength(1);
    expect(api.registrations.size).toBe(4);
    expect(
      [...api.registrations.values()].filter((script) => script.id.includes("builtin"))
    ).toHaveLength(2);
    expect(
      [...api.registrations.values()].every((script) => script.runAt === "document_start")
    ).toBe(true);
  });
});
