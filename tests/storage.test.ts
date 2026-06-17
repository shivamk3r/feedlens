import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import {
  clearApiKey,
  getApiKey,
  getCacheEntryCount,
  getSettings,
  hasApiKey,
  putCacheEntry,
  saveApiKey,
  saveSettings
} from "../src/shared/storage";
import type { AnalysisResult } from "../src/shared/types";
import { getChromeMock } from "./helpers/chrome";

const result: AnalysisResult = {
  marker: "green",
  confidence: "high",
  information_quality_score: 90,
  misinformation_risk_score: 8,
  manipulation_pressure_score: 10,
  overall_risk_score: 9,
  summary: "Specific and low pressure.",
  signals: [],
  counter_reading: "The post could still omit context.",
  suggested_user_action: "Use it as one input."
};

describe("extension storage helpers", () => {
  it("returns safe default settings", async () => {
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("stores API keys in session storage by default and clears both key locations", async () => {
    await saveApiKey(" test-key ", "session");
    await expect(getApiKey(DEFAULT_SETTINGS)).resolves.toBe("test-key");
    expect(getChromeMock().storage.local.data).not.toHaveProperty("feedlens.geminiApiKey.local.v1");

    await clearApiKey();
    await expect(hasApiKey(DEFAULT_SETTINGS)).resolves.toBe(false);
  });

  it("stores API keys in local storage only when local mode is selected", async () => {
    const settings = await saveSettings({ storageMode: "local" });
    await saveApiKey("local-key", "local");

    await expect(getApiKey(settings)).resolves.toBe("local-key");
    expect(getChromeMock().storage.session.data).not.toHaveProperty(
      "feedlens.geminiApiKey.session.v1"
    );
  });

  it("stores analysis cache entries without raw post text", async () => {
    await putCacheEntry({
      cacheKey: "hash-model-prompt",
      result,
      createdAt: new Date().toISOString(),
      model: "gemini-2.5-flash",
      promptVersion: "feed-lens-v1"
    });

    expect(await getCacheEntryCount()).toBe(1);
    expect(JSON.stringify(getChromeMock().storage.local.data)).not.toContain("raw LinkedIn post");
  });
});
