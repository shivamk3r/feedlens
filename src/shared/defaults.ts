import type { FeedLensSettings } from "./types";

export const DEFAULT_MODEL = "gemini-3.5-flash";

export const DEFAULT_SETTINGS: FeedLensSettings = {
  enabled: true,
  backgroundAnalysis: true,
  privacyAccepted: false,
  storageMode: "local",
  model: DEFAULT_MODEL,
  temperature: 0.2,
  maxOutputTokens: 1400,
  analysisDepth: "balanced",
  storeCache: true,
  highlightIntensity: "standard",
  sensitivity: "balanced",
  uiMode: "both",
  maxVisiblePostsPerRun: 6
};

export const ERROR_MESSAGES = {
  missingApiKey: "No Gemini API key configured. Add your Gemini API key in settings.",
  privacyNotAccepted:
    "Accept the privacy notice before analyzing visible LinkedIn posts with Gemini.",
  disabled: "Feed Lens is paused. Resume analysis to scan visible posts.",
  providerError:
    "Gemini returned an error. Check your API key, billing status, or rate limits.",
  keyValidationFailed:
    "Gemini could not use this API key. Check the key, billing status, project access, or rate limits.",
  rateLimited: "Your Gemini rate limit was reached. Try fewer posts or wait before analyzing again.",
  invalidResponse: "Gemini returned an invalid response. Try again in a moment.",
  noPosts: "No visible LinkedIn posts detected. Scroll to your feed and try again.",
  unexpected: "Feed Lens hit an unexpected error. Try again in a moment."
} as const;
