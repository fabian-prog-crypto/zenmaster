import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { zipSync } from "fflate";

const execFileAsync = promisify(execFile);
const root = process.cwd();
await execFileAsync(process.execPath, ["scripts/check-package.mjs"]);
const dist = path.join(root, "dist");
const manifest = JSON.parse(await readFile(path.join(dist, "manifest.json"), "utf8"));
const entries = {};
for (const file of await walk(dist)) {
  const relative = path.relative(dist, file).split(path.sep).join("/");
  entries[relative] = new Uint8Array(await readFile(file));
}
const archive = zipSync(entries, { level: 9, mtime: new Date("1980-01-01T00:00:00.000Z") });
const artifacts = path.join(root, "artifacts");
await mkdir(artifacts, { recursive: true });
const output = path.join(artifacts, `zen-master-v${manifest.version}.zip`);
await writeFile(output, archive);
console.log(output);

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory)) {
    const file = path.join(directory, entry);
    if ((await stat(file)).isDirectory()) output.push(...(await walk(file)));
    else output.push(file);
  }
  return output.sort();
}
