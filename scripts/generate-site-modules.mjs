import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalog = JSON.parse(await readFile(path.join(root, "src/adapters/catalog.json"), "utf8"));
const siteRoot = path.join(root, "src/adapters/sites");
await mkdir(siteRoot, { recursive: true });
const imports = [];
const names = [];
for (const entry of catalog) {
  const variable = `${entry.id}Adapter`;
  imports.push(`import ${variable} from "./${entry.id}.js";`);
  names.push(variable);
  await writeFile(
    path.join(siteRoot, `${entry.id}.ts`),
    `import { createCatalogAdapter } from "../site-factory.js";\n\nexport default createCatalogAdapter("${entry.id}");\n`
  );
}
await writeFile(
  path.join(siteRoot, "index.ts"),
  `${imports.join("\n")}\n\nexport const siteAdapters = [\n  ${names.join(",\n  ")}\n] as const;\n`
);
console.log(`Generated ${catalog.length} dedicated site modules.`);
