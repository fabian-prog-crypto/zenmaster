import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("Manifest V3 build", () => {
  it("generates only the approved permissions and 105 persistent host patterns", async () => {
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
    expect(manifest.version).toBe("0.1.2");
    expect(manifest.name).toBe("Zen Master");
    expect([...manifest.permissions].sort()).toEqual(["activeTab", "scripting", "storage"]);
    expect(manifest.optional_host_permissions).toEqual(["http://*/*", "https://*/*"]);
    expect(manifest.host_permissions).toHaveLength(105);
    expect(manifest.host_permissions).toContain("https://pornhub.com/*");
    expect(manifest.host_permissions).toContain("https://www.pornhub.com/*");
    expect(manifest.host_permissions).toContain("https://de.pornhub.org/*");
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
    for (const file of Object.values(manifest.icons)) {
      const icon = decodeRgbaPng(await readFile(`dist/${file}`));
      const corners = [
        3,
        (icon.width - 1) * 4 + 3,
        (icon.height - 1) * icon.width * 4 + 3,
        (icon.width * icon.height - 1) * 4 + 3
      ];
      expect(corners.map((index) => icon.pixels[index])).toEqual([0, 0, 0, 0]);
      const visiblePixels = Array.from(
        { length: icon.width * icon.height },
        (_, index) => icon.pixels[index * 4 + 3]
      ).filter((alpha) => alpha && alpha > 0).length;
      expect(visiblePixels).toBeGreaterThan(icon.width * icon.height * 0.65);
    }
    const iconSource = await readFile("src/icons/zen-master.svg", "utf8");
    expect(iconSource).toContain('data-mark="meditation"');
    expect(iconSource).not.toContain("Apple Color Emoji");
    const contentBundle = await readFile("dist/content/bootstrap.js", "utf8");
    expect(contentBundle).not.toMatch(/^export\s/m);
    const backgroundBundle = await readFile("dist/background/service-worker.js", "utf8");
    expect(backgroundBundle).toContain("action.setIcon");
  });
});

function decodeRgbaPng(input: Buffer): { width: number; height: number; pixels: Buffer } {
  const width = input.readUInt32BE(16);
  const height = input.readUInt32BE(20);
  if (input[24] !== 8 || input[25] !== 6) throw new Error("Expected an 8-bit RGBA PNG");
  const data: Buffer[] = [];
  for (let offset = 8; offset < input.length;) {
    const length = input.readUInt32BE(offset);
    if (input.toString("ascii", offset + 4, offset + 8) === "IDAT") {
      data.push(input.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const filtered = inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(width * height * 4);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[source++] ?? 0;
    for (let x = 0; x < width * 4; x += 1) {
      const value = filtered[source++]!;
      const left = x >= 4 ? pixels[y * width * 4 + x - 4]! : 0;
      const above = y > 0 ? pixels[(y - 1) * width * 4 + x]! : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * width * 4 + x - 4]! : 0;
      pixels[y * width * 4 + x] = (value + unfilterValue(filter, left, above, upperLeft)) & 0xff;
    }
  }
  return { width, height, pixels };
}

function unfilterValue(filter: number, left: number, above: number, upperLeft: number): number {
  if (filter === 0) return 0;
  if (filter === 1) return left;
  if (filter === 2) return above;
  if (filter === 3) return Math.floor((left + above) / 2);
  if (filter !== 4) throw new Error(`Unsupported PNG filter ${filter}`);
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}
