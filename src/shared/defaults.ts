import type { FeedLensSettings } from "./types";

export const DEFAULT_MODEL = "gemini-2.5-flash";

export const GEMINI_MODEL_OPTIONS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-3.5-flash"
] as const;

export const DEFAULT_SETTINGS: FeedLensSettings = {
  enabled: true,
  backgroundAnalysis: true,
  privacyAccepted: false,
  storageMode: "session",
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
    "Gemini returned an error. Check your API key, model name, billing status, or rate limits.",
  rateLimited: "Your Gemini rate limit was reached. Try fewer posts or wait before analyzing again.",
  invalidResponse: "The model returned an invalid response. Try again or switch models.",
  noPosts: "No visible LinkedIn posts detected. Scroll to your feed and try again."
} as const;
