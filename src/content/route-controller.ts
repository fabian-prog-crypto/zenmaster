import { ROUTE_EVENT } from "./route-events.js";

export class RouteController {
  #lastUrl: string;
  #pending = false;
  #started = false;
  readonly #onEvent = () => this.#schedule();

  constructor(
    private readonly target: Window,
    private readonly reinitialize: () => void
  ) {
    this.#lastUrl = target.location.href;
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#lastUrl = this.target.location.href;
    for (const event of [ROUTE_EVENT, "popstate", "hashchange"]) {
      this.target.addEventListener(event, this.#onEvent);
    }
  }

  stop(): void {
    if (!this.#started) return;
    this.#started = false;
    for (const event of [ROUTE_EVENT, "popstate", "hashchange"]) {
      this.target.removeEventListener(event, this.#onEvent);
    }
  }

  #schedule(): void {
    if (this.#pending) return;
    this.#pending = true;
    queueMicrotask(() => {
      this.#pending = false;
      if (!this.#started || this.target.location.href === this.#lastUrl) return;
      this.#lastUrl = this.target.location.href;
      this.reinitialize();
    });
  }
}
