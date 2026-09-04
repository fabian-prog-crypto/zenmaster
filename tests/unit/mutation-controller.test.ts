import { describe, expect, it, vi } from "vitest";
import { MutationController } from "../../src/content/mutation-controller.js";

describe("mutation controller", () => {
  it("batches inserted ancestors and does not rescan the document", async () => {
    document.body.innerHTML = "";
    const processed: Array<Document | Element | ShadowRoot> = [];
    const controller = new MutationController(document, (root) => processed.push(root), {
      requestFrame: (callback) => callback(0),
      requestIdle: (callback) => callback({ didTimeout: false, timeRemaining: () => 10 }),
      now: vi.fn(() => 0),
      maxRoots: 100
    });
    controller.start();
    const parent = document.createElement("section");
    parent.append(document.createElement("article"), document.createElement("article"));
    document.body.append(parent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(processed).toEqual([parent]);
    expect(processed).not.toContain(document);
    controller.stop();
  });

  it("discovers open shadow roots and defers work past the root limit", async () => {
    document.body.innerHTML = "";
    const processed: Array<Document | Element | ShadowRoot> = [];
    const idle: Array<() => void> = [];
    const controller = new MutationController(document, (root) => processed.push(root), {
      requestFrame: (callback) => callback(0),
      requestIdle: (callback) => {
        idle.push(() => callback({ didTimeout: false, timeRemaining: () => 10 }));
      },
      now: () => 0,
      maxRoots: 1
    });
    controller.start();
    const host = document.createElement("div");
    host.attachShadow({ mode: "open" }).innerHTML = "<section></section>";
    const sibling = document.createElement("aside");
    document.body.append(host, sibling);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(processed).toHaveLength(1);
    expect(idle).toHaveLength(1);
    idle[0]!();
    expect(processed).toHaveLength(2);
    controller.stop();
  });

  it("reprocesses the parent when children are removed", async () => {
    document.body.innerHTML = `<section><article></article></section>`;
    const processed: Array<Document | Element | ShadowRoot> = [];
    const controller = new MutationController(document, (root) => processed.push(root), {
      requestFrame: (callback) => callback(0),
      requestIdle: (callback) => callback({ didTimeout: false, timeRemaining: () => 10 }),
      now: () => 0,
      maxRoots: 100
    });
    controller.start();
    const section = document.querySelector("section")!;
    section.querySelector("article")!.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(processed).toEqual([section]);
    controller.stop();
  });

  it("reprocesses an existing feed container when cards are inserted", async () => {
    document.body.innerHTML = `<section id="rail"></section>`;
    const processed: Array<Document | Element | ShadowRoot> = [];
    const controller = new MutationController(document, (root) => processed.push(root), {
      requestFrame: (callback) => callback(0),
      requestIdle: (callback) => callback({ didTimeout: false, timeRemaining: () => 10 }),
      now: () => 0,
      maxRoots: 100
    });
    controller.start();
    const rail = document.querySelector("#rail")!;
    rail.append(
      document.createElement("article"),
      document.createElement("article"),
      document.createElement("article")
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(processed).toEqual([rail]);
    controller.stop();
  });
});
