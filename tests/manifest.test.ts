import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("extension manifest and privacy guardrails", () => {
  it("keeps permissions narrow and Gemini-only", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions.sort()).toEqual(["activeTab", "sidePanel", "storage"]);
    expect(manifest.host_permissions.sort()).toEqual([
      "https://generativelanguage.googleapis.com/*",
      "https://www.linkedin.com/*"
    ]);
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
