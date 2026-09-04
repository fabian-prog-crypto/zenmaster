export type Request =
  | { version: 1; type: "GET_PAGE_STATUS" }
  | { version: 1; type: "ADD_CURRENT_SITE"; tabId: number; origin: string }
  | { version: 1; type: "LIST_SETTINGS" }
  | { version: 1; type: "REMOVE_CUSTOM_SITE"; scheme: "http" | "https"; hostname: string };

export type ParsedMessage = { ok: true; value: Request } | { ok: false; error: "invalid-message" };

export function parseMessage(input: unknown): ParsedMessage {
  if (!isRecord(input) || input.version !== 1 || typeof input.type !== "string") return invalid();
  switch (input.type) {
    case "GET_PAGE_STATUS":
    case "LIST_SETTINGS":
      return hasKeys(input, ["version", "type"])
        ? { ok: true, value: input as Request }
        : invalid();
    case "ADD_CURRENT_SITE":
      return hasKeys(input, ["version", "type", "tabId", "origin"]) &&
        Number.isInteger(input.tabId) &&
        typeof input.origin === "string"
        ? { ok: true, value: input as Request }
        : invalid();
    case "REMOVE_CUSTOM_SITE":
      return hasKeys(input, ["version", "type", "scheme", "hostname"]) &&
        (input.scheme === "http" || input.scheme === "https") &&
        typeof input.hostname === "string"
        ? { ok: true, value: input as Request }
        : invalid();
    default:
      return invalid();
  }
}

function hasKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(): ParsedMessage {
  return { ok: false, error: "invalid-message" };
}
