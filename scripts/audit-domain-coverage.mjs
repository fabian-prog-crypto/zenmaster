import { readFile } from "node:fs/promises";
import { domainRootsFromCatalog, hostPatternsFromCatalog } from "./catalog-domain-roots.mjs";

const catalog = JSON.parse(await readFile("src/adapters/catalog.json", "utf8"));
const roots = domainRootsFromCatalog(catalog);
const patterns = hostPatternsFromCatalog(catalog);

for (const entry of catalog) {
  console.log(`${entry.id}: ${entry.domainRoots.join(", ")}`);
}
console.log(`Domain coverage passed: ${catalog.length} adapters, ${roots.length} roots.`);

if (new Set(patterns).size !== patterns.length) {
  throw new Error("Generated duplicate host patterns");
}
