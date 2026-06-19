export const PROMPT_VERSION = "feedlens-v1";

export type SupportedPlatformId = "linkedin" | "x";
export type Marker = "green" | "yellow" | "red";
export type Confidence = "low" | "medium" | "high";
export type Severity = "low" | "medium" | "high";

export type SignalType =
  | "information_quality"
  | "missing_evidence"
  | "misinformation_risk"
  | "fear_threat_framing"
  | "artificial_urgency"
  | "status_anxiety"
  | "self_worth_pressure"
  | "authority_signaling"
  | "social_proof_pressure"
  | "engagement_bait"
  | "false_binary"
  | "overgeneralization"
  | "vague_promise"
  | "emotional_storytelling";

export interface AnalysisSignal {
  type: SignalType;
  severity: Severity;
  evidence: string;
  explanation: string;
}

export interface AnalysisResult {
  marker: Marker;
  confidence: Confidence;
  information_quality_score: number;
  misinformation_risk_score: number;
  manipulation_pressure_score: number;
  overall_risk_score: number;
  summary: string;
  signals: AnalysisSignal[];
  counter_reading: string;
  suggested_user_action: string;
}

export interface ExtractedPost {
  platform: SupportedPlatformId;
  postId: string;
  hash: string;
  text: string;
  author?: string;
  url?: string;
  detectedAt: string;
}

export type StorageMode = "session" | "local";
export type AnalysisDepth = "fast" | "balanced" | "deep";
export type HighlightIntensity = "subtle" | "standard" | "strong";
export type Sensitivity = "conservative" | "balanced" | "strict";
export type UiMode = "feed_highlights" | "marker_only";

export interface FeedLensSettings {
  enabled: boolean;
  backgroundAnalysis: boolean;
  privacyAccepted: boolean;
  privacyNoticeVersion: number;
  storageMode: StorageMode;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  analysisDepth: AnalysisDepth;
  storeCache: boolean;
  highlightIntensity: HighlightIntensity;
  sensitivity: Sensitivity;
  uiMode: UiMode;
  maxVisiblePostsPerRun: number;
}

export interface AnalysisCacheEntry {
  cacheKey: string;
  result: AnalysisResult;
  createdAt: string;
  model: string;
  promptVersion: string;
}

export type DebugLogSource = "content" | "background" | "gemini" | "popup" | "debug";
export type DebugLogSeverity = "debug" | "info" | "warn" | "error";
export type DebugLogPayload = Record<string, string | number | boolean>;

export interface DebugLogEntry {
  id: string;
  createdAt: string;
  source: DebugLogSource;
  severity: DebugLogSeverity;
  event: string;
  payload?: DebugLogPayload;
}

export interface AppendDebugLogRequest {
  source: DebugLogSource;
  severity?: DebugLogSeverity;
  event: string;
  payload?: Record<string, unknown>;
}

export interface SetupStatus {
  settings: FeedLensSettings;
  hasApiKey: boolean;
  cacheEntryCount: number;
}

export interface ApiKeyHealth {
  status: "valid";
  checkedAt: string;
  model: string;
}

export type FeedLensErrorCode =
  | "missing_api_key"
  | "privacy_not_accepted"
  | "disabled"
  | "provider_error"
  | "rate_limited"
  | "invalid_response"
  | "no_posts"
  | "unknown";

export interface FeedLensError {
  code: FeedLensErrorCode;
  message: string;
  retryable: boolean;
}

export interface AnalyzePostRequest {
  post: ExtractedPost;
  force?: boolean;
}

export interface AnalyzePostSuccess {
  ok: true;
  hash: string;
  result: AnalysisResult;
  source: "cache" | "gemini";
}

export interface AnalyzePostFailure {
  ok: false;
  hash?: string;
  error: FeedLensError;
}

export type AnalyzePostResponse = AnalyzePostSuccess | AnalyzePostFailure;

export interface ValidateApiKeySuccess {
  ok: true;
  checkedAt: string;
}

export interface ValidateApiKeyFailure {
  ok: false;
  error: FeedLensError;
}

export type ValidateApiKeyResponse = ValidateApiKeySuccess | ValidateApiKeyFailure;

export type BackgroundMessage =
  | { type: "feedlens:getStatus" }
  | { type: "feedlens:analyzePost"; payload: AnalyzePostRequest }
  | { type: "feedlens:validateApiKey"; payload: { apiKey: string } }
  | { type: "feedlens:clearCache" }
  | { type: "feedlens:getDebugLogs" }
  | { type: "feedlens:clearDebugLogs" }
  | { type: "feedlens:appendDebugLog"; payload: AppendDebugLogRequest };

export type ContentMessage =
  | { type: "feedlens-content:getState" }
  | { type: "feedlens-content:reanalyzeVisible" }
  | { type: "feedlens-content:reanalyzeHash"; payload: { hash: string } }
  | { type: "feedlens-content:setPaused"; payload: { paused: boolean } }
  | { type: "feedlens-content:clearVisibleResults" };

export interface ContentState {
  detectedCount: number;
  analyzedCount: number;
  pendingCount: number;
  errorCount: number;
  paused: boolean;
  lastError?: string;
  supported: boolean;
  platform?: SupportedPlatformId;
  platformLabel?: string;
}
