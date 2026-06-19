import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("extension build modes", () => {
  it("emits debug artifacts only for development builds", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    expect(packageJson.scripts["build:dev"]).toBe("node scripts/build.mjs --development");

    execFileSync(process.execPath, ["scripts/build.mjs", "--development"], { stdio: "pipe" });
    expect(existsSync("dist/debug.html")).toBe(true);
    expect(existsSync("dist/assets/debug.js")).toBe(true);

    execFileSync(process.execPath, ["scripts/build.mjs"], { stdio: "pipe" });
    expect(existsSync("dist/debug.html")).toBe(false);
    expect(existsSync("dist/assets/debug.js")).toBe(false);
    expect(existsSync("dist/sidepanel.html")).toBe(false);
    expect(existsSync("dist/assets/sidepanel.js")).toBe(false);
  });
});
