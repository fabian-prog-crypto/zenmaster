import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("production package policy", () => {
  it("accepts the production build after inspecting permissions and executable content", async () => {
    await execFileAsync(process.execPath, ["scripts/build.mjs"]);
    const result = await execFileAsync(process.execPath, ["scripts/check-package.mjs"]);
    expect(result.stdout).toContain("Package policy passed");
  });
});
