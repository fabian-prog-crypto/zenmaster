import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const manifest = JSON.parse(await readFile(path.join(dist, "manifest.json"), "utf8"));
const catalog = JSON.parse(await readFile(path.join(root, "src/adapters/catalog.json"), "utf8"));
const expectedHosts = catalog
  .flatMap(({ primaryHostname, aliases }) => [
    `https://${primaryHostname}/*`,
    `https://www.${primaryHostname}/*`,
    ...aliases.map((hostname) => `https://${hostname}/*`)
  ])
  .sort();

assertEqual(
  [...manifest.permissions].sort(),
  ["activeTab", "scripting", "storage"],
  "required permissions"
);
assertEqual(manifest.optional_host_permissions, ["http://*/*", "https://*/*"], "optional hosts");
assertEqual([...manifest.host_permissions].sort(), expectedHosts, "persistent hosts");

const files = await walk(dist);
const forbiddenExtensions = /\.(?:jpe?g|gif|webp|mp4|webm|mov|m3u8)$/i;
for (const file of files) {
  const relative = path.relative(dist, file);
  if (forbiddenExtensions.test(relative)) fail(`${relative}: forbidden media artifact`);
  const content = await readFile(file, "utf8");
  if (/\.html$/i.test(file) && /<script(?![^>]*\bsrc=)[^>]*>/i.test(content)) {
    fail(`${relative}: inline script`);
  }
  if (/\.js$/i.test(file)) {
    for (const [label, pattern] of [
      ["eval", /\beval\s*\(/],
      ["new Function", /new\s+Function\s*\(/],
      ["fetch", /\bfetch\s*\(/],
      ["XMLHttpRequest", /\bXMLHttpRequest\b/],
      ["WebSocket", /\bWebSocket\b/]
    ]) {
      if (pattern.test(content)) fail(`${relative}: forbidden ${label} capability`);
    }
  }
}

console.log(`Package policy passed for ${files.length} production files.`);

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory)) {
    const file = path.join(directory, entry);
    if ((await stat(file)).isDirectory()) output.push(...(await walk(file)));
    else output.push(file);
  }
  return output.sort();
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} mismatch`);
  }
}

function fail(message) {
  throw new Error(message);
}
