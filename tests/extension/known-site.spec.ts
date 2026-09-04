import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { launchExtension, type ExtensionContext } from "../helpers/extension-context.js";

let extension: ExtensionContext | undefined;

test.beforeAll(async () => {
  extension = await launchExtension();
});

test.afterAll(async () => {
  await extension?.close();
});

test("registers persistent built-in scripts and hides watch recommendations", async () => {
  await expect
    .poll(() =>
      extension!.worker.evaluate(
        async () =>
          (await chrome.scripting.getRegisteredContentScripts()).filter((script) =>
            script.id.startsWith("afb_builtin_")
          ).length
      )
    )
    .toBe(2);

  const fixture = await readFile(
    path.join(process.cwd(), "tests/fixtures/pornhub/watch.html"),
    "utf8"
  );
  const page = await extension!.context.newPage();
  await page.route("https://pornhub.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: fixture })
  );
  await page.goto("https://pornhub.com/video/afb-fixture");
  await expect(page.locator(".related-videos")).toHaveAttribute(
    "data-afb-hidden",
    /recommendation/
  );
  await expect(page.locator(".video-player")).not.toHaveAttribute("data-afb-hidden", /.*/);
  await expect(page.locator("video")).toBeAttached();
});

test("preserves search results and renders all settings entries", async () => {
  const fixture = await readFile(
    path.join(process.cwd(), "tests/fixtures/pornhub/search.html"),
    "utf8"
  );
  const page = await extension!.context.newPage();
  await page.route("https://pornhub.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: fixture })
  );
  await page.goto("https://pornhub.com/search?q=afb-fixture");
  await expect(page.locator(".search-results")).not.toHaveAttribute("data-afb-hidden", /.*/);

  const settings = await extension!.context.newPage();
  await settings.goto(`chrome-extension://${extension!.extensionId}/settings/index.html`);
  await expect(settings.getByText("🧘 Zen Master")).toBeVisible();
  await expect(settings.locator("[data-built-in]")).toHaveCount(50);
  await expect(settings.getByText("Private by construction")).toBeVisible();
});
