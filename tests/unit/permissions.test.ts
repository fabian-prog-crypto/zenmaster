import { describe, expect, it } from "vitest";
import { addCustomSite, removeCustomSite } from "../../src/background/permissions.js";
import { createChromeFake } from "../helpers/chrome-fake.js";

describe("custom site permission lifecycle", () => {
  it("requests permission before any asynchronous API and activates the current tab", async () => {
    const api = createChromeFake();
    const result = await addCustomSite(api, { tabId: 7, origin: "https://Example.com/watch?q=x" });
    expect(result.ok).toBe(true);
    expect(api.calls[0]).toBe("permissions.request:https://example.com/*");
    expect(api.calls).toContain("storage.set");
    expect(api.calls).toContain("scripting.execute:MAIN");
    expect(api.calls).toContain("scripting.execute:ISOLATED");
  });

  it("does not store or register after denial", async () => {
    const api = createChromeFake({ permissionGranted: false });
    const result = await addCustomSite(api, { tabId: 7, origin: "https://denied.test" });
    expect(result).toEqual({ ok: false, error: "permission-denied" });
    expect(api.calls).toEqual(["permissions.request:https://denied.test/*"]);
  });

  it("unregisters, removes local state, then removes the exact permission", async () => {
    const api = createChromeFake();
    api.granted.add("https://example.com/*");
    api.setStored({
      schemaVersion: 1,
      customSites: [{ scheme: "https", hostname: "example.com", addedAt: 1 }]
    });
    await removeCustomSite(api, { scheme: "https", hostname: "example.com" });
    expect(api.calls.indexOf("scripting.unregister")).toBeLessThan(
      api.calls.indexOf("storage.set")
    );
    expect(api.calls.indexOf("storage.set")).toBeLessThan(
      api.calls.indexOf("permissions.remove:https://example.com/*")
    );
  });
});
