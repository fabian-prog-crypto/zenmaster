import type { AdapterRegistry } from "../adapters/registry.js";
import { adapterRegistry } from "../adapters/index.js";
import type { Rule, SiteAdapter } from "../adapters/types.js";
import { parseMessage } from "../shared/messages.js";
import type { PageKind } from "../shared/page-kind.js";
import type { PageStatus } from "../shared/status.js";
import { AutoAdvanceController } from "./auto-advance.js";
import { Blocker } from "./blocker.js";
import { classifyPage } from "./classifier.js";
import { detectCreatorPaths } from "./creator-guard.js";
import {
  classifyGenericPage,
  registerGenericProtectedRoots,
  scanRecommendations,
  type GenericPageContext,
  type StructuralScanResult
} from "./generic-detector.js";
import { MutationController } from "./mutation-controller.js";
import { LinkNeutralizer } from "./link-neutralizer.js";
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
  const linkNeutralizer = new LinkNeutralizer(options.page, protection);
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

  const structuralContextForKnown = (kind: PageKind): GenericPageContext => {
    if (kind !== "watch") return { pageKind: kind };
    const primaryPlayer = options.page.querySelector(
      "video, [data-player], [class*='video-player' i], [id*='player' i]"
    );
    return primaryPlayer ? { pageKind: kind, primaryPlayer } : { pageKind: kind };
  };

  const applyStructural = (
    root: Document | Element | ShadowRoot,
    context: GenericPageContext,
    ruleId: "generic-high-confidence" | "structural-high-confidence"
  ): StructuralScanResult => {
    registerGenericProtectedRoots(options.page, context, protection);
    if (context.pageKind === "restricted") return { matches: [], observedMediaGroups: 0 };
    const scan = scanRecommendations(root, {
      pageKind: context.pageKind,
      protection,
      ...(context.primaryPlayer ? { primaryPlayer: context.primaryPlayer } : {})
    });
    blocker?.blockElements(
      scan.matches.map((match) => match.candidate),
      ruleId
    );
    return scan;
  };

  const applyGeneric = (root: Document | Element | ShadowRoot) => {
    genericContext = classifyGenericPage(currentUrl(), options.page);
    pageKind = genericContext.pageKind;
    return applyStructural(root, genericContext, "generic-high-confidence");
  };

  const applyCreatorPaths = (
    root: Document | Element | ShadowRoot,
    context: GenericPageContext
  ) => {
    const detected = detectCreatorPaths(root, {
      pageKind: context.pageKind,
      protection,
      ...(context.primaryPlayer ? { primaryPlayer: context.primaryPlayer } : {})
    });
    blocker?.blockElements(detected.containers, "creator-path");
    linkNeutralizer.neutralize(
      detected.links.filter((link) => link.closest("[data-afb-hidden]") === null)
    );
  };

  const processInserted = (root: Element | ShadowRoot) => {
    if (adapter) {
      registerKnownProtection(adapter, pageKind);
      const result = blocker?.applyRules(root, exactRules(adapter, pageKind));
      if (result?.errors.length) status = { ...status, state: "needs-update" };
      const context = structuralContextForKnown(pageKind);
      const scan = applyStructural(root, context, "structural-high-confidence");
      applyCreatorPaths(root, context);
      if (
        scan.observedMediaGroups > 0 &&
        blocker?.totalBlocked === 0 &&
        ["home", "blocked-listing", "watch"].includes(pageKind)
      ) {
        status = { ...status, state: "needs-update" };
      }
    } else {
      applyGeneric(root);
      applyCreatorPaths(root, genericContext);
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
    linkNeutralizer.restoreAll();
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
      applyCreatorPaths(options.page, genericContext);
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
    const structuralContext = structuralContextForKnown(pageKind);
    const structuralScan = applyStructural(
      options.page,
      structuralContext,
      "structural-high-confidence"
    );
    applyCreatorPaths(options.page, structuralContext);
    if (options.page.readyState !== "loading") {
      for (const check of adapter.healthChecks[pageKind] ?? []) {
        if (check.required && !options.page.querySelector(check.selector)) degraded = true;
      }
    }
    if (
      structuralScan.observedMediaGroups > 0 &&
      blocker.totalBlocked === 0 &&
      ["home", "blocked-listing", "watch"].includes(pageKind)
    ) {
      degraded = true;
    }
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
      linkNeutralizer.restoreAll();
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
      ...(frame.inFrame
        ? {}
        : {
            onStatusChange: (status: PageStatus) => {
              void chrome.runtime
                .sendMessage({
                  version: 1,
                  type: "SET_TAB_BADGE",
                  count: status.blockedVideoCount
                })
                .catch(() => undefined);
            }
          }),
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
