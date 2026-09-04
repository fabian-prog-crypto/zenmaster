interface IdleDeadlineLike {
  didTimeout: boolean;
  timeRemaining(): number;
}

export interface MutationScheduler {
  requestFrame(callback: FrameRequestCallback): number | void;
  requestIdle(callback: (deadline: IdleDeadlineLike) => void): number | void;
  now(): number;
  maxRoots: number;
}

const defaultScheduler: MutationScheduler = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  requestIdle: (callback) => {
    const requestIdle = globalThis.requestIdleCallback;
    if (requestIdle) return requestIdle(callback);
    globalThis.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 0);
    return undefined;
  },
  now: () => performance.now(),
  maxRoots: 100
};

export class MutationController {
  readonly #queued = new Set<Element | ShadowRoot>();
  readonly #observers = new Set<MutationObserver>();
  #scheduled = false;
  #started = false;

  constructor(
    private readonly page: Document,
    private readonly process: (root: Element | ShadowRoot) => void,
    private readonly scheduler: MutationScheduler = defaultScheduler
  ) {}

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#observe(this.page);
    this.#discoverShadowRoots(this.page);
  }

  stop(): void {
    this.#started = false;
    this.#scheduled = false;
    this.#queued.clear();
    for (const observer of this.#observers) observer.disconnect();
    this.#observers.clear();
  }

  #observe(root: Document | ShadowRoot): void {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          this.#enqueue(node);
          this.#discoverShadowRoots(node);
        }
        if (record.removedNodes.length > 0) {
          if (record.target instanceof Element || record.target instanceof ShadowRoot) {
            this.#enqueue(record.target);
          } else if (this.page.documentElement) {
            this.#enqueue(this.page.documentElement);
          }
        }
      }
      this.#scheduleFrame();
    });
    observer.observe(root, { childList: true, subtree: true });
    this.#observers.add(observer);
  }

  #discoverShadowRoots(root: Document | Element): void {
    const elements =
      root instanceof Element
        ? [root, ...root.querySelectorAll("*")]
        : [...root.querySelectorAll("*")];
    for (const element of elements) {
      if (element.shadowRoot) this.#observe(element.shadowRoot);
    }
  }

  #enqueue(element: Element | ShadowRoot): void {
    for (const queued of this.#queued) {
      if (queued.contains(element)) return;
      if (element.contains(queued)) this.#queued.delete(queued);
    }
    this.#queued.add(element);
  }

  #scheduleFrame(): void {
    if (!this.#started || this.#scheduled || this.#queued.size === 0) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.scheduler.requestFrame(() => this.#drain());
    });
  }

  #drain(): void {
    this.#scheduled = false;
    const startedAt = this.scheduler.now();
    let processed = 0;
    while (this.#queued.size > 0 && processed < this.scheduler.maxRoots) {
      if (processed > 0 && this.scheduler.now() - startedAt >= 40) break;
      const root = this.#queued.values().next().value;
      if (!root) break;
      this.#queued.delete(root);
      this.process(root);
      processed += 1;
    }
    if (this.#queued.size > 0) {
      this.#scheduled = true;
      this.scheduler.requestIdle(() => {
        this.#scheduled = false;
        if (this.#started) this.#drain();
      });
    }
  }
}
