// Render the social preview image (site/og.png) used by WhatsApp, iMessage, Slack, and friends.
//   node scripts/render-og.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = process.cwd();
const site = path.join(root, "site");
const page = await readFile(path.join(site, "index.html"), "utf8");
const symbol = page.match(/<symbol id="zm"[\s\S]*?<\/symbol>/)[0];
const garden = page.match(/<aside class="river"[\s\S]*?<svg[^>]*>([\s\S]*?)<\/svg>/)[1];
const font = pathToFileURL(path.join(site, "fonts", "rethink-sans-latin.woff2")).href;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: "Rethink Sans"; font-weight: 400 800; src: url("${font}") format("woff2"); }
  html, body { margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #ecf4ee; color: #122419;
    font-family: "Rethink Sans", "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; position: relative; }
  .brand { position: absolute; left: 88px; top: 76px; display: flex; align-items: center; gap: 18px; font-size: 30px; font-weight: 600; letter-spacing: -0.01em; }
  .brand svg { width: 64px; height: 64px; }
  h1 { position: absolute; left: 88px; top: 220px; margin: 0; width: 720px; font-size: 104px; line-height: 0.98; letter-spacing: -0.035em; font-weight: 700; }
  .cta { position: absolute; left: 88px; top: 486px; padding: 20px 34px; border-radius: 18px; background: #e6b13c; font-size: 30px; font-weight: 600; }
  .garden { position: absolute; right: 40px; top: 0; height: 630px; width: 300px; }
  .garden svg { height: 100%; width: 100%; }
  .water { fill: none; stroke: rgba(38, 98, 112, 0.42); stroke-width: 1.4; stroke-linecap: round; stroke-dasharray: 12 8; }
  .stone { fill: rgba(118, 124, 116, 0.42); stroke: rgba(70, 78, 72, 0.55); stroke-width: 1; }
  .moss { fill: rgba(92, 150, 100, 0.34); }
  .wood { fill: none; stroke: rgba(134, 88, 54, 0.7); stroke-linecap: round; }
  .backing { fill: #ecf4ee; }
  .rake { fill: none; stroke: rgba(160, 138, 92, 0.5); stroke-width: 0.9; }
  .needle { fill: none; stroke: rgba(48, 104, 70, 0.7); stroke-width: 1; stroke-linecap: round; }
  .leaf { fill: #b8482e; opacity: 0.85; } .leaf.second { fill: #c9962f; }
</style></head><body>
  <svg width="0" height="0" style="position:absolute">${symbol}</svg>
  <div class="brand"><svg><use href="#zm"/></svg>Zen Master</div>
  <h1>You came for one video.</h1>
  <div class="cta">Install for Chrome</div>
  <div class="garden"><svg viewBox="0 380 200 420" preserveAspectRatio="xMidYMid slice">${garden}</svg></div>
</body></html>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1
});
const tab = await ctx.newPage();
await tab.setContent(html, { waitUntil: "load" });
await tab.evaluate(() => document.fonts.ready);
const png = await tab.screenshot({ type: "png" });
await browser.close();
await writeFile(path.join(site, "og.png"), png);
console.log(`site/og.png ${(png.length / 1024).toFixed(0)} KB`);
