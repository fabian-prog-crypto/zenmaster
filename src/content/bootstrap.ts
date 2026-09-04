import type { AdapterRegistry } from "../adapters/registry.js";
import { adapterRegistry } from "../adapters/index.js";
import type { Rule, SiteAdapter } from "../adapters/types.js";
import { parseMessage } from "../shared/messages.js";
import type { PageKind } from "../shared/page-kind.js";
import type { PageStatus } from "../shared/status.js";
import { AutoAdvanceController } from "./auto-advance.js";
import { Blocker } from "./blocker.js";
import { classifyPage } from "./classifier.js";
import {
  classifyGenericPage,
  detectGeneric,
  registerGenericProtectedRoots,
  type GenericPageContext
} from "./generic-detector.js";
import { MutationController } from "./mutation-controller.js";
import { ProtectionRegistry } from "./protection-registry.js";
import { countRecommendationCards } from "./recommendation-counter.js";
import { RouteController } from "./route-controller.js";

export interface ContentKernelOptions {
  page: Document;
  url: URL | (() => URL);
  registry: AdapterRegistry;
  observe: boolean;
  inFrame: boolean;
  sameOriginFrame?: boolean;
  onStatusChange?: (status: PageStatus) => void;
}

export interface ContentKernel {
  start(): void;
  stop(): void;
  getStatus(): PageStatus;
}

export function createContentKernel(options: ContentKernelOptions): ContentKernel {
  const protection = new ProtectionRegistry();
  let blocker: Blocker | undefined;
  let autoAdvance = new AutoAdvanceController(options.page);
  let mutation: MutationController | undefined;
  let route: RouteController | undefined;
  let domReadyListener: (() => void) | undefined;
  let adapter: SiteAdapter | undefined;
  let pageKind: PageKind = "unknown";
  let genericContext: GenericPageContext = { pageKind: "unknown" };
  let status: PageStatus = {
    state: "unsupported",
    blockedCount: 0,
    blockedVideoCount: 0,
    autoAdvanceBlocked: false
  };
  let started = false;

  const currentUrl = () => (options.url instanceof URL ? options.url : options.url());

  const publish = (next: Omit<PageStatus, "blockedVideoCount">) => {
    status = {
      ...next,
      blockedVideoCount: countRecommendationCards(
        blocker?.hiddenRoots ?? [],
        adapter?.recommendationCardSelectors
      )
    };
    options.onStatusChange?.({ ...status });
  };

  const registerKnownProtection = (currentAdapter: SiteAdapter, kind: PageKind) => {
    for (const selector of currentAdapter.protectedSelectors[kind] ?? []) {
      try {
        for (const element of options.page.querySelectorAll(selector)) protection.register(element);
      } catch {
        // Adapter validation catches static errors; a host page can still invalidate browser-specific selectors.
      }
    }
  };

  const exactRules = (currentAdapter: SiteAdapter, kind: PageKind): Rule[] => [
    ...(currentAdapter.hideSelectors[kind] ?? []),
    ...currentAdapter.globalRecommendationSelectors
  ];

  const applyGeneric = (root: Document | Element | ShadowRoot) => {
    genericContext = classifyGenericPage(currentUrl(), options.page);
    pageKind = genericContext.pageKind;
    registerGenericProtectedRoots(options.page, genericContext, protection);
    if (genericContext.pageKind === "restricted") return;
    const matches = detectGeneric(root, {
      pageKind: genericContext.pageKind,
      protection,
      ...(genericContext.primaryPlayer ? { primaryPlayer: genericContext.primaryPlayer } : {})
    });
    blocker?.blockElements(
      matches.map((match) => match.candidate),
      "generic-high-confidence"
    );
  };

  const processInserted = (root: Element | ShadowRoot) => {
    if (adapter) {
      registerKnownProtection(adapter, pageKind);
      const result = blocker?.applyRules(root, exactRules(adapter, pageKind));
      if (result?.errors.length) status = { ...status, state: "needs-update" };
    } else {
      applyGeneric(root);
    }
    publish({
      state: status.state,
      ...(status.adapterId ? { adapterId: status.adapterId } : {}),
      pageKind,
      blockedCount: blocker?.totalBlocked ?? 0,
      autoAdvanceBlocked: status.autoAdvanceBlocked
    });
  };

  const initialize = () => {
    blocker?.restoreAll();
    protection.clear();
    autoAdvance.dispose();
    autoAdvance = new AutoAdvanceController(options.page);
    const url = currentUrl();
    adapter = options.registry.getAdapterForHostname(url.hostname);
    if (
      options.inFrame &&
      (!adapter || adapter.frameSupport === "top-only" || options.sameOriginFrame !== true)
    ) {
      publish({ state: "restricted", blockedCount: 0, autoAdvanceBlocked: false });
      return;
    }

    if (!adapter) {
      blocker = new Blocker("generic", options.page, protection);
      applyGeneric(options.page);
      publish({
        state: genericContext.pageKind === "restricted" ? "restricted" : "active-generic",
        pageKind: genericContext.pageKind,
        blockedCount: blocker.totalBlocked,
        autoAdvanceBlocked: false
      });
      return;
    }

    const classification = classifyPage(adapter, url, options.page);
    pageKind = classification.pageKind;
    blocker = new Blocker(adapter.id, options.page, protection);
    if (pageKind === "restricted") {
      publish({
        state: "restricted",
        adapterId: adapter.id,
        pageKind,
        blockedCount: 0,
        autoAdvanceBlocked: false
      });
      return;
    }
    registerKnownProtection(adapter, pageKind);
    const result = blocker.applyRules(options.page, exactRules(adapter, pageKind));
    let degraded = classification.degraded || result.errors.length > 0;
    if (options.page.readyState !== "loading") {
      for (const check of adapter.healthChecks[pageKind] ?? []) {
        if (check.required && !options.page.querySelector(check.selector)) degraded = true;
      }
    }
    if (classification.degraded || pageKind === "unknown") applyGeneric(options.page);
    const autoResult = autoAdvance.apply(adapter.disableAutoAdvance);
    if (autoResult.errors.length) degraded = true;
    publish({
      state: degraded || pageKind === "unknown" ? "needs-update" : "active-known",
      adapterId: adapter.id,
      pageKind,
      blockedCount: blocker.totalBlocked,
      autoAdvanceBlocked: autoResult.blocked
    });
  };

  return {
    start() {
      if (started) return;
      started = true;
      initialize();
      if (options.observe && status.state !== "restricted") {
        mutation = new MutationController(options.page, processInserted);
        mutation.start();
        const view = options.page.defaultView;
        if (view) {
          route = new RouteController(view, initialize);
          route.start();
        }
      }
      if (options.page.readyState === "loading") {
        domReadyListener = initialize;
        options.page.addEventListener("DOMContentLoaded", domReadyListener, { once: true });
      }
    },
    stop() {
      mutation?.stop();
      route?.stop();
      autoAdvance.dispose();
      blocker?.restoreAll();
      if (domReadyListener) options.page.removeEventListener("DOMContentLoaded", domReadyListener);
      started = false;
    },
    getStatus() {
      return { ...status };
    }
  };
}

function frameContext(): { inFrame: boolean; sameOriginFrame: boolean } {
  if (window.top === window) return { inFrame: false, sameOriginFrame: true };
  try {
    return { inFrame: true, sameOriginFrame: window.parent.location.origin === location.origin };
  } catch {
    return { inFrame: true, sameOriginFrame: false };
  }
}

if (typeof chrome !== "undefined" && chrome.runtime?.id && typeof window !== "undefined") {
  const scope = globalThis as typeof globalThis & { __afbKernel?: ContentKernel };
  if (!scope.__afbKernel && /^https?:$/.test(location.protocol)) {
    const frame = frameContext();
    const kernel = createContentKernel({
      page: document,
      url: () => new URL(location.href),
      registry: adapterRegistry,
      observe: true,
      ...frame
    });
    scope.__afbKernel = kernel;
    kernel.start();
    chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
      const parsed = parseMessage(raw);
      if (parsed.ok && parsed.value.type === "GET_PAGE_STATUS") {
        sendResponse({ ok: true, status: kernel.getStatus() });
      }
      return false;
    });
  }
}
