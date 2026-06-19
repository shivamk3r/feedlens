import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("extension manifest and privacy guardrails", () => {
  it("keeps permissions narrow and Gemini-only", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions.sort()).toEqual(["activeTab", "storage"]);
    expect(manifest.side_panel).toBeUndefined();
    expect(manifest.host_permissions.sort()).toEqual([
      "https://generativelanguage.googleapis.com/*",
      "https://www.linkedin.com/*",
      "https://x.com/*"
    ]);
  });

  it("configures Chrome extension icons with committed assets", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
    const expectedIcons = {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    };

    expect(manifest.icons).toEqual(expectedIcons);
    expect(manifest.action.default_icon).toEqual(expectedIcons);

    for (const iconPath of Object.values(expectedIcons)) {
      expect(existsSync(`public/${iconPath}`)).toBe(true);
    }
  });

  it("does not reference non-MVP providers in source provider code", () => {
    const source = [
      readFileSync("src/background/gemini.ts", "utf8"),
      readFileSync("src/shared/defaults.ts", "utf8"),
      readFileSync("src/shared/prompt.ts", "utf8")
    ].join("\n");

    expect(source).not.toMatch(/openai|anthropic|ollama/i);
  });

  it("does not read local env files during the build", () => {
    const buildScript = readFileSync("scripts/build.mjs", "utf8");
    expect(buildScript).not.toContain("dotenv");
    expect(buildScript).not.toContain("GEMINI_API_KEY");
    expect(buildScript).not.toContain("\".env\"");
    expect(buildScript).not.toContain("'.env'");
  });
});
