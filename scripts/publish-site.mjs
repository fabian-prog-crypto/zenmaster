// Publish the landing page with the current extension build.
//
//   npm run site:publish              package if needed, stamp the version, deploy to production
//   npm run site:publish -- --no-deploy   same, but stop before deploying
//
// The page links to /download, which Vercel rewrites to the current versioned zip,
// so nothing in the page has to be edited by hand when the version changes.
import { access, copyFile, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const site = path.join(root, "site");
const { version } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const zipName = `zen-master-v${version}.zip`;
const source = path.join(root, "artifacts", zipName);
const deploy = !process.argv.includes("--no-deploy");
const scope = process.env.VERCEL_SCOPE || "studio66";

// 1. Make sure the build for this version exists.
try {
  await access(source);
} catch {
  console.log(`No ${zipName} in artifacts/, building it.`);
  execFileSync("npm", ["run", "build"], { stdio: "inherit" });
  execFileSync("npm", ["run", "package"], { stdio: "inherit" });
}

// 2. Only the current zip ships with the site.
for (const file of await readdir(site)) {
  if (file.endsWith(".zip")) await unlink(path.join(site, file));
}
await copyFile(source, path.join(site, zipName));

// 3. /download always resolves to the current zip and saves under its real name.
const config = {
  cleanUrls: true,
  rewrites: [{ source: "/download", destination: `/${zipName}` }],
  headers: [
    {
      source: "/download",
      headers: [
        { key: "Content-Disposition", value: `attachment; filename="${zipName}"` },
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" }
      ]
    },
    {
      source: "/fonts/(.*)",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
    }
  ]
};
await writeFile(path.join(site, "vercel.json"), JSON.stringify(config, null, 2) + "\n");

// 4. Stamp the version into the page.
const page = path.join(site, "index.html");
const html = await readFile(page, "utf8");
if (!html.includes("<span data-version>"))
  throw new Error("site/index.html has no <span data-version> marker");
await writeFile(page, html.replace(/(<span data-version>)[^<]*(<\/span>)/g, `$1${version}$2`));

// 5. Deploy.
if (deploy) {
  execFileSync("vercel", ["deploy", "--cwd", site, "--prod", "--yes", "--scope", scope], {
    stdio: "inherit"
  });
}
console.log(`Site carries Zen Master ${version} at /download${deploy ? "." : " (not deployed)."}`);
