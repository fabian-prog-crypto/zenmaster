import type { AutoAdvanceRule } from "../adapters/types.js";

export interface AutoAdvanceResult {
  supported: boolean;
  blocked: boolean;
  errors: string[];
}

export class AutoAdvanceController {
  readonly #disposers: Array<() => void> = [];

  constructor(private readonly page: Document) {}

  apply(rule: AutoAdvanceRule | undefined): AutoAdvanceResult {
    if (!rule || rule.type === "none") return { supported: false, blocked: false, errors: [] };
    try {
      if (rule.type === "toggle-off") {
        const control = this.page.querySelector<HTMLElement>(rule.selector);
        if (!control) return { supported: true, blocked: false, errors: [] };
        if (control.getAttribute(rule.stateAttribute) === rule.onValue) control.click();
        return { supported: true, blocked: true, errors: [] };
      }
      if (rule.type === "hide-countdown") {
        const countdown = this.page.querySelector(rule.selector);
        if (!countdown) return { supported: true, blocked: false, errors: [] };
        countdown.setAttribute("data-afb-hidden", "auto-advance:countdown");
        return { supported: true, blocked: true, errors: [] };
      }
      const video = this.page.querySelector<HTMLVideoElement>(rule.selector);
      if (!video) return { supported: true, blocked: false, errors: [] };
      const guard = (event: Event) => event.stopImmediatePropagation();
      video.addEventListener("ended", guard, { capture: true });
      this.#disposers.push(() => video.removeEventListener("ended", guard, { capture: true }));
      return { supported: true, blocked: true, errors: [] };
    } catch (error) {
      return {
        supported: true,
        blocked: false,
        errors: [error instanceof Error ? error.message : "auto-advance-error"]
      };
    }
  }

  dispose(): void {
    for (const dispose of this.#disposers.splice(0)) dispose();
  }
}
