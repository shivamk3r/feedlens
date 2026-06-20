import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import {
  clearApiKey,
  getApiKey,
  getApiKeyHealth,
  getCacheEntryCount,
  getSettings,
  getSetupStatus,
  hasApiKey,
  putCacheEntry,
  saveApiKey,
  saveApiKeyHealth,
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

  it("reports missing API key as not configured setup status", async () => {
    await expect(getSetupStatus()).resolves.toMatchObject({
      hasApiKey: false,
      setup: {
        code: "missing_api_key",
        ready: false,
        label: "Not configured",
        detail: "No Gemini API key is saved."
      }
    });
  });

  it("requires privacy acceptance even when a saved key has passed validation", async () => {
    await saveApiKey("test-key");
    await saveApiKeyHealth({
      status: "valid",
      checkedAt: "2026-06-17T00:00:00.000Z",
      model: DEFAULT_SETTINGS.model
    });

    await expect(getSetupStatus()).resolves.toMatchObject({
      hasApiKey: true,
      apiKeyHealth: {
        status: "valid",
        checkedAt: "2026-06-17T00:00:00.000Z",
        model: DEFAULT_SETTINGS.model
      },
      setup: {
        code: "privacy_not_accepted",
        ready: false,
        label: "Privacy needed",
        detail: "Accept the privacy notice before FeedLens analyzes visible posts."
      }
    });
  });

  it("reports ready setup status with saved key health after privacy acceptance", async () => {
    await saveApiKey("test-key");
    await saveApiKeyHealth({
      status: "valid",
      checkedAt: "2026-06-17T00:00:00.000Z",
      model: DEFAULT_SETTINGS.model
    });
    await saveSettings({ privacyAccepted: true });

    await expect(getSetupStatus()).resolves.toMatchObject({
      hasApiKey: true,
      apiKeyHealth: {
        status: "valid",
        checkedAt: "2026-06-17T00:00:00.000Z",
        model: DEFAULT_SETTINGS.model
      },
      setup: {
        code: "ready",
        ready: true,
        label: "Ready",
        detail: "Gemini analysis check passed."
      }
    });
  });

  it("reports ready setup status without treating key health as required", async () => {
    await saveApiKey("test-key");
    await saveSettings({ privacyAccepted: true });

    await expect(getSetupStatus()).resolves.toMatchObject({
      hasApiKey: true,
      apiKeyHealth: undefined,
      setup: {
        code: "ready",
        ready: true,
        label: "Ready",
        detail: "Gemini key saved and privacy notice accepted."
      }
    });
  });

  it("stores API keys in local storage by default and clears both key locations", async () => {
    await saveApiKey(" test-key ");
    await saveApiKeyHealth({
      status: "valid",
      checkedAt: "2026-06-17T00:00:00.000Z",
      model: DEFAULT_SETTINGS.model
    });

    await expect(getApiKey(DEFAULT_SETTINGS)).resolves.toBe("test-key");
    await expect(getApiKeyHealth()).resolves.toEqual({
      status: "valid",
      checkedAt: "2026-06-17T00:00:00.000Z",
      model: DEFAULT_SETTINGS.model
    });
    expect(getChromeMock().storage.local.data).toHaveProperty(
      "feedlens.geminiApiKey.local.v1",
      "test-key"
    );
    expect(getChromeMock().storage.session.data).not.toHaveProperty(
      "feedlens.geminiApiKey.session.v1"
    );

    await getChromeMock().storage.session.set({
      "feedlens.geminiApiKey.session.v1": "legacy-session-key"
    });

    await clearApiKey();
    await expect(hasApiKey(DEFAULT_SETTINGS)).resolves.toBe(false);
    await expect(getApiKeyHealth()).resolves.toBeUndefined();
    expect(getChromeMock().storage.session.data).not.toHaveProperty(
      "feedlens.geminiApiKey.session.v1"
    );
  });

  it("ignores legacy session-only API keys", async () => {
    await getChromeMock().storage.session.set({
      "feedlens.geminiApiKey.session.v1": "legacy-session-key"
    });

    await expect(getApiKey(DEFAULT_SETTINGS)).resolves.toBeUndefined();
    await expect(hasApiKey(DEFAULT_SETTINGS)).resolves.toBe(false);
  });

  it("resets hidden dev-time settings to customer-facing defaults", async () => {
    const settings = await saveSettings({
      privacyAccepted: true,
      enabled: false,
      backgroundAnalysis: false,
      storageMode: "session",
      model: "gemini-2.5-flash-lite",
      temperature: 1.8,
      maxOutputTokens: 4096,
      analysisDepth: "deep",
      storeCache: false,
      highlightIntensity: "strong",
      sensitivity: "strict",
      uiMode: "marker_only",
      maxVisiblePostsPerRun: 20
    });

    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      enabled: false,
      privacyAccepted: true,
      uiMode: "marker_only"
    });
  });

  it("normalizes legacy side-panel UI modes to inline feed highlights", async () => {
    await getChromeMock().storage.local.set({
      "feedlens.settings.v1": {
        ...DEFAULT_SETTINGS,
        privacyAccepted: true,
        privacyNoticeVersion: 2,
        uiMode: "side_panel_only"
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      privacyAccepted: true,
      uiMode: "feed_highlights"
    });
  });

  it("requires re-acceptance for legacy privacy notice versions", async () => {
    await getChromeMock().storage.local.set({
      "feedlens.settings.v1": {
        ...DEFAULT_SETTINGS,
        privacyAccepted: true,
        privacyNoticeVersion: 1
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      privacyAccepted: false
    });
  });

  it("stores analysis cache entries without raw post text", async () => {
    await putCacheEntry({
      cacheKey: "hash-model-prompt",
      result,
      createdAt: new Date().toISOString(),
      model: DEFAULT_SETTINGS.model,
      promptVersion: "feedlens-v1"
    });

    expect(await getCacheEntryCount()).toBe(1);
    expect(JSON.stringify(getChromeMock().storage.local.data)).not.toContain("raw LinkedIn post");
  });
});
