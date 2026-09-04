import type { PageStatus } from "../shared/status.js";

interface PopupActions {
  onAdd?: () => void | Promise<void>;
  settingsUrl?: string;
}

const copy = {
  "active-known": ["Zen mode is on", "Recommendations are hidden on this supported site."],
  "active-generic": [
    "Zen mode is on",
    "High-confidence recommendations are hidden with generic rules."
  ],
  "needs-update": [
    "Protection may need an update",
    "Generic safeguards are still active where safe."
  ],
  unsupported: ["Not yet protected", "Add this site to use conservative generic protection."],
  "permission-denied": ["Permission not granted", "The page is unchanged. You can try again."],
  restricted: ["Unavailable on this page", "Chrome does not allow extensions to modify this page."]
} as const;

export function renderPopup(root: Element, status: PageStatus, actions: PopupActions = {}): void {
  root.replaceChildren();
  const [title, description] = copy[status.state];
  const brand = make("div", "brand");
  brand.append(make("span", "brand-mark", "🧘"), make("span", "brand-name", "Zen Master"));
  const state = make("section", `state state--${status.state}`);
  const eyebrow = make(
    "p",
    "eyebrow",
    status.state === "restricted" ? "Page status" : "Always-on protection"
  );
  const heading = make("h1", "state-title", title);
  const detail = make("p", "state-detail", description);
  state.append(eyebrow, heading, detail);
  if (["active-known", "active-generic", "needs-update"].includes(status.state)) {
    const count = make(
      "p",
      "count",
      `${status.blockedCount} recommendation area${status.blockedCount === 1 ? "" : "s"} hidden`
    );
    state.append(count);
  }

  const controls = make("div", "controls");
  if ((status.state === "unsupported" || status.state === "permission-denied") && actions.onAdd) {
    const add = make("button", "primary", "Block recommendations on this site");
    add.setAttribute("data-action", "add-site");
    add.addEventListener("click", () => void actions.onAdd?.());
    controls.append(add);
  } else if (status.state === "unsupported" || status.state === "permission-denied") {
    const add = make("button", "primary", "Block recommendations on this site");
    add.setAttribute("data-action", "add-site");
    controls.append(add);
  }
  const settings = make("a", "settings-link", "Open Settings");
  settings.setAttribute("href", actions.settingsUrl ?? "#");
  settings.setAttribute("target", "_blank");
  controls.append(settings);
  const live = make("p", "sr-only");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("data-live", "");
  root.append(brand, state, controls, live);
}

async function initializePopup(): Promise<void> {
  const root = document.querySelector("#app");
  if (!root) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = safeUrl(tab?.url);
  if (!tab?.id || !url || !/^https?:$/.test(url.protocol)) {
    renderPopup(root, emptyStatus("restricted"), {
      settingsUrl: chrome.runtime.getURL("settings/index.html")
    });
    return;
  }
  let status: PageStatus = emptyStatus("unsupported");
  try {
    const response = (await chrome.tabs.sendMessage(tab.id, {
      version: 1,
      type: "GET_PAGE_STATUS"
    })) as { ok?: boolean; status?: PageStatus } | undefined;
    if (response?.ok && response.status) status = response.status;
  } catch {
    // A missing content script means the web origin is eligible but not protected yet.
  }
  const render = () =>
    renderPopup(root, status, {
      settingsUrl: chrome.runtime.getURL("settings/index.html"),
      onAdd: async () => {
        const button = root.querySelector<HTMLButtonElement>("[data-action='add-site']");
        if (button) button.disabled = true;
        const response = (await chrome.runtime.sendMessage({
          version: 1,
          type: "ADD_CURRENT_SITE",
          tabId: tab.id,
          origin: url.origin
        })) as { ok: boolean; error?: string; reloadRequired?: boolean };
        if (!response.ok) {
          status = emptyStatus(
            response.error === "permission-denied" ? "permission-denied" : "unsupported"
          );
          render();
          return;
        }
        status = { state: "active-generic", blockedCount: 0, autoAdvanceBlocked: false };
        render();
        const live = root.querySelector<HTMLElement>("[data-live]");
        if (live)
          live.textContent = response.reloadRequired
            ? "Protection added. Reload this page once."
            : "Protection added.";
      }
    });
  render();
}

function emptyStatus(state: PageStatus["state"]): PageStatus {
  return { state, blockedCount: 0, autoAdvanceBlocked: false };
}

function safeUrl(input: string | undefined): URL | undefined {
  if (!input) return undefined;
  try {
    return new URL(input);
  } catch {
    return undefined;
  }
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) void initializePopup();
