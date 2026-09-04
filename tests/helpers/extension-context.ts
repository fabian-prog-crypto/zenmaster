import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type BrowserContext, type Worker } from "@playwright/test";

export interface ExtensionContext {
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  close(): Promise<void>;
}

export async function launchExtension(): Promise<ExtensionContext> {
  const profile = await mkdtemp(path.join(tmpdir(), "zen-master-test-"));
  const extensionPath = path.join(process.cwd(), "dist");
  const executablePath = process.env.CHROME_PATH ?? chromium.executablePath();
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    executablePath,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-first-run",
      "--no-default-browser-check"
    ]
  });
  let worker = context.serviceWorkers()[0];
  worker ??= await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).hostname;
  return {
    context,
    worker,
    extensionId,
    async close() {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  };
}
