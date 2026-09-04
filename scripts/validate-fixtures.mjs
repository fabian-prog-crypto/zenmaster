import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "tests/fixtures");
const adapterDirectories = (await readdir(root, { withFileTypes: true })).filter(
  (entry) => entry.isDirectory() && entry.name !== "generic"
);
let htmlCount = 0;
for (const directory of adapterDirectories) {
  const files = await readdir(path.join(root, directory.name));
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  if (htmlFiles.length < 4)
    throw new Error(`${directory.name} has only ${htmlFiles.length} fixtures`);
  for (const file of htmlFiles) {
    const html = await readFile(path.join(root, directory.name, file), "utf8");
    if (/<(?:script|img|source|iframe)\b/i.test(html))
      throw new Error(`${directory.name}/${file} has forbidden content`);
    if (/https?:\/\//i.test(html)) throw new Error(`${directory.name}/${file} has an external URL`);
    if (!html.includes("data-afb-expect"))
      throw new Error(`${directory.name}/${file} lacks expectations`);
    htmlCount += 1;
  }
}
if (adapterDirectories.length !== 50 || htmlCount < 200) {
  throw new Error(
    `Expected 50 directories and 200 fixtures, got ${adapterDirectories.length}/${htmlCount}`
  );
}
const genericCorpus = JSON.parse(await readFile(path.join(root, "generic/corpus.json"), "utf8"));
if (!Array.isArray(genericCorpus) || genericCorpus.length < 100) {
  throw new Error("Generic precision corpus must contain at least 100 labeled cases");
}
console.log(
  `Validated ${htmlCount} sanitized fixtures across ${adapterDirectories.length} adapters.`
);
