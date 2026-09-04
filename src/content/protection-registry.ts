export class ProtectionRegistry {
  readonly #roots = new Set<Element>();

  register(root: Element | null | undefined): void {
    if (root) this.#roots.add(root);
  }

  clear(): void {
    this.#roots.clear();
  }

  intersects(candidate: Element): boolean {
    for (const root of this.#roots) {
      if (!root.isConnected) {
        this.#roots.delete(root);
        continue;
      }
      if (root === candidate || root.contains(candidate) || candidate.contains(root)) return true;
    }
    return false;
  }
}
