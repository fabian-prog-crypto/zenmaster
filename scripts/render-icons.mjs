import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const source = await readFile(path.join(root, "src/icons/zen-master.svg"), "utf8");
const document = `<!doctype html>
<html>
  <head>
    <style>
      html, body { width: 100%; height: 100%; margin: 0; background: transparent; overflow: hidden; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
  </head>
  <body>${source}</body>
</html>`;

const browser = await chromium.launch({ headless: true });
try {
  for (const size of [16, 32, 48, 128]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1
    });
    await page.setContent(document);
    await page.screenshot({
      path: path.join(root, `src/icons/zen-master-${size}.png`),
      omitBackground: true
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log("Rendered Zen Master icons at 16, 32, 48, and 128 px.");
