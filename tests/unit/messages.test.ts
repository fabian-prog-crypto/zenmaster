import { describe, expect, it } from "vitest";
import { parseMessage } from "../../src/shared/messages.js";

describe("versioned messages", () => {
  it("accepts known closed-shape requests", () => {
    expect(parseMessage({ version: 1, type: "GET_PAGE_STATUS" })).toEqual({
      ok: true,
      value: { version: 1, type: "GET_PAGE_STATUS" }
    });
    expect(
      parseMessage({ version: 1, type: "ADD_CURRENT_SITE", tabId: 3, origin: "https://x.test" })
    ).toEqual({
      ok: true,
      value: { version: 1, type: "ADD_CURRENT_SITE", tabId: 3, origin: "https://x.test" }
    });
    expect(parseMessage({ version: 1, type: "SET_TAB_BADGE", count: 2 })).toEqual({
      ok: true,
      value: { version: 1, type: "SET_TAB_BADGE", count: 2 }
    });
  });

  it("rejects invalid badge counts", () => {
    for (const count of [-1, 1.5, Number.NaN, 1_000_001]) {
      expect(parseMessage({ version: 1, type: "SET_TAB_BADGE", count })).toEqual({
        ok: false,
        error: "invalid-message"
      });
    }
  });

  it("rejects unknown versions, types, and extra fields", () => {
    for (const input of [
      { version: 2, type: "GET_PAGE_STATUS" },
      { version: 1, type: "RUN_CODE", code: "alert(1)" },
      { version: 1, type: "GET_PAGE_STATUS", url: "https://secret.test" },
      { version: 1, type: "SET_TAB_BADGE", count: 2, url: "https://secret.test" }
    ]) {
      expect(parseMessage(input)).toEqual({ ok: false, error: "invalid-message" });
    }
  });
});
