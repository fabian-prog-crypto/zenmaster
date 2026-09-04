import type { Rule, SiteAdapter } from "./types.js";

export function defineAdapter(input: SiteAdapter): Readonly<SiteAdapter> {
  if (!/^[a-z0-9]+$/.test(input.id)) throw new Error(`Invalid adapter ID: ${input.id}`);
  if (!input.hostnames.length) throw new Error(`Adapter ${input.id} has no hostnames`);
  if (!Number.isInteger(input.ruleVersion) || input.ruleVersion < 1) {
    throw new Error(`Invalid rule version for ${input.id}`);
  }
  const ruleIds = new Set<string>();
  const allRules = [
    ...Object.values(input.hideSelectors).flatMap((rules) => rules ?? []),
    ...input.globalRecommendationSelectors
  ];
  for (const rule of allRules) validateRule(rule, ruleIds);
  for (const selectors of Object.values(input.protectedSelectors)) {
    for (const selector of selectors ?? []) validateSelector(selector);
  }
  for (const selector of input.recommendationCardSelectors ?? []) validateSelector(selector);
  for (const checks of Object.values(input.healthChecks)) {
    for (const check of checks ?? []) validateSelector(check.selector);
  }
  return deepFreeze({
    ...input,
    hostnames: input.hostnames.map((host) => host.toLowerCase())
  });
}

function validateRule(rule: Rule, ids: Set<string>): void {
  if (!rule.id || ids.has(rule.id)) throw new Error(`Duplicate rule ID: ${rule.id}`);
  ids.add(rule.id);
  validateSelector(rule.selector);
  if (rule.container.type === "closest") validateSelector(rule.container.selector);
  if (
    rule.container.type === "parent" &&
    (!Number.isInteger(rule.container.levels) ||
      rule.container.levels < 1 ||
      rule.container.levels > 8)
  ) {
    throw new Error(`Invalid parent traversal for ${rule.id}`);
  }
}

function validateSelector(selector: string): void {
  if (!selector || selector.length > 500) throw new Error(`Invalid selector: ${selector}`);
  if (typeof document !== "undefined") {
    try {
      document.querySelector(selector);
    } catch {
      throw new Error(`Invalid selector: ${selector}`);
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
