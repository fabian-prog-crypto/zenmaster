import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const dist = path.join(root, "dist");
const catalog = JSON.parse(await readFile(path.join(root, "src/adapters/catalog.json"), "utf8"));
const manifestBase = JSON.parse(await readFile(path.join(root, "src/manifest.base.json"), "utf8"));

const hostPermissions = catalog
  .flatMap(({ primaryHostname, aliases }) => [
    `https://${primaryHostname}/*`,
    `https://www.${primaryHostname}/*`,
    ...aliases.map((hostname) => `https://${hostname}/*`)
  ])
  .toSorted();

if (hostPermissions.length !== 104 || new Set(hostPermissions).size !== 104) {
  throw new Error(`Expected 104 unique built-in host patterns, got ${hostPermissions.length}`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const sharedBuild = {
  outdir: dist,
  bundle: true,
  platform: "browser",
  target: "chrome102",
  sourcemap: false,
  legalComments: "none",
  charset: "utf8",
  logLevel: "silent"
};

await build({
  entryPoints: {
    "background/service-worker": "src/background/service-worker.ts",
    "popup/popup": "src/popup/popup.ts",
    "settings/settings": "src/settings/settings.ts"
  },
  ...sharedBuild,
  format: "esm"
});

await build({
  entryPoints: {
    "content/bootstrap": "src/content/bootstrap.ts",
    "content/route-bridge": "src/content/route-bridge.ts"
  },
  ...sharedBuild,
  format: "iife"
});

for (const directory of ["popup", "settings"]) {
  await mkdir(path.join(dist, directory), { recursive: true });
  await cp(
    path.join(root, `src/${directory}/index.html`),
    path.join(dist, `${directory}/index.html`)
  );
  await cp(
    path.join(root, `src/${directory}/${directory}.css`),
    path.join(dist, `${directory}/${directory}.css`)
  );
}

await mkdir(path.join(dist, "icons"), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await cp(
    path.join(root, `src/icons/zen-master-${size}.png`),
    path.join(dist, `icons/zen-master-${size}.png`)
  );
}

const manifest = { ...manifestBase, host_permissions: hostPermissions };
await writeFile(path.join(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
