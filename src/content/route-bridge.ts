import { ROUTE_EVENT } from "./route-events.js";

export { ROUTE_EVENT } from "./route-events.js";

export function installRouteBridge(target: Window): () => void {
  const historyObject = target.history;
  const originalPush = historyObject.pushState;
  const originalReplace = historyObject.replaceState;
  const emit = () => target.dispatchEvent(new Event(ROUTE_EVENT));

  historyObject.pushState = function (...args: Parameters<History["pushState"]>): void {
    originalPush.apply(this, args);
    emit();
  };
  historyObject.replaceState = function (...args: Parameters<History["replaceState"]>): void {
    originalReplace.apply(this, args);
    emit();
  };

  return () => {
    historyObject.pushState = originalPush;
    historyObject.replaceState = originalReplace;
  };
}

if (typeof window !== "undefined") {
  const key = Symbol.for("afb.routeBridge");
  const scope = globalThis as typeof globalThis & { [key: symbol]: boolean | undefined };
  if (!scope[key]) {
    scope[key] = true;
    installRouteBridge(window);
  }
}
