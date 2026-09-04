import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("Manifest V3 build", () => {
  it("generates only the approved permissions and 104 persistent host patterns", async () => {
    await execFileAsync(process.execPath, ["scripts/build.mjs"]);
    const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8")) as {
      manifest_version: number;
      version: string;
      name: string;
      permissions: string[];
      host_permissions: string[];
      optional_host_permissions: string[];
      background: unknown;
      icons: Record<string, string>;
      action: { default_icon: Record<string, string> };
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe("0.1.1");
    expect(manifest.name).toBe("Zen Master");
    expect([...manifest.permissions].sort()).toEqual(["activeTab", "scripting", "storage"]);
    expect(manifest.optional_host_permissions).toEqual(["http://*/*", "https://*/*"]);
    expect(manifest.host_permissions).toHaveLength(104);
    expect(manifest.host_permissions).toContain("https://pornhub.com/*");
    expect(manifest.host_permissions).toContain("https://www.pornhub.com/*");
    expect(manifest.host_permissions).toContain("https://txxx.tube/*");
    expect(manifest.host_permissions).not.toContain("https://www.txxx.tube/*");
    expect(manifest.background).toEqual({
      service_worker: "background/service-worker.js",
      type: "module"
    });
    expect(manifest.icons).toEqual({
      16: "icons/zen-master-16.png",
      32: "icons/zen-master-32.png",
      48: "icons/zen-master-48.png",
      128: "icons/zen-master-128.png"
    });
    expect(manifest.action.default_icon).toEqual(manifest.icons);
    await Promise.all(Object.values(manifest.icons).map((file) => stat(`dist/${file}`)));
    const iconSource = await readFile("src/icons/zen-master.svg", "utf8");
    expect(iconSource).toContain('data-mark="meditation"');
    expect(iconSource).not.toContain("Apple Color Emoji");
    const contentBundle = await readFile("dist/content/bootstrap.js", "utf8");
    expect(contentBundle).not.toMatch(/^export\s/m);
    const backgroundBundle = await readFile("dist/background/service-worker.js", "utf8");
    expect(backgroundBundle).toContain("action.setIcon");
  });
});
