import { appendDebugLog } from "../shared/debug";
import { ERROR_MESSAGES } from "../shared/defaults";
import { createCacheKey } from "../shared/hash";
import { platformLabel } from "../shared/platforms";
import { buildGeminiRequestBody } from "../shared/prompt";
import {
  getAnalysisJsonDiagnostics,
  parseAnalysisJson,
  validateAnalysisResult
} from "../shared/schema";
import {
  clearCache,
  getApiKey,
  getCacheEntry,
  getSettings,
  putCacheEntry
} from "../shared/storage";
import {
  PROMPT_VERSION,
  type AnalysisResult,
  type AnalyzePostRequest,
  type AnalyzePostResponse,
  type SupportedPlatformId,
  type ValidateApiKeyResponse
} from "../shared/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const POST_ANALYSIS_MAX_ATTEMPTS = 2;
const VALIDATION_POST_TEXT =
  "FeedLens connection check: A team shared a neutral project update with two specific results and no urgent claim.";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    finishReason?: string;
    safetyRatings?: unknown[];
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: unknown[];
  };
}

interface GeminiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface GeminiCallOptions {
  attempt?: number;
  maxAttempts?: number;
  hash?: string;
  platform?: SupportedPlatformId;
  purpose?: "post_analysis" | "validation";
}

export async function analyzePost({
  post,
  force = false
}: AnalyzePostRequest): Promise<AnalyzePostResponse> {
  await appendDebugLog({
    source: "background",
    event: "analyze_start",
    payload: { hash: post.hash, platform: post.platform, force, purpose: "post_analysis" }
  });

  const settings = await getSettings();

  if (!settings.enabled) {
    await appendDebugLog({
      source: "background",
      severity: "warn",
      event: "analyze_blocked",
      payload: {
        hash: post.hash,
        platform: post.platform,
        code: "disabled",
        purpose: "post_analysis"
      }
    });
    return {
      ok: false,
      hash: post.hash,
      error: { code: "disabled", message: ERROR_MESSAGES.disabled, retryable: true }
    };
  }

  if (!settings.privacyAccepted) {
    await appendDebugLog({
      source: "background",
      severity: "warn",
      event: "analyze_blocked",
      payload: {
        hash: post.hash,
        platform: post.platform,
        code: "privacy_not_accepted",
        purpose: "post_analysis"
      }
    });
    return {
      ok: false,
      hash: post.hash,
      error: {
        code: "privacy_not_accepted",
        message: ERROR_MESSAGES.privacyNotAccepted,
        retryable: false
      }
    };
  }

  const apiKey = await getApiKey(settings);
  if (!apiKey) {
    await appendDebugLog({
      source: "background",
      severity: "warn",
      event: "analyze_blocked",
      payload: {
        hash: post.hash,
        platform: post.platform,
        code: "missing_api_key",
        purpose: "post_analysis"
      }
    });
    return {
      ok: false,
      hash: post.hash,
      error: { code: "missing_api_key", message: ERROR_MESSAGES.missingApiKey, retryable: false }
    };
  }

  const cacheKey = await createCacheKey(post.text, settings.model, PROMPT_VERSION, post.platform);
  if (settings.storeCache && !force) {
    const cached = await getCacheEntry(cacheKey);
    if (cached) {
      await appendDebugLog({
        source: "background",
        event: "cache_hit",
        payload: {
          hash: post.hash,
          platform: post.platform,
          model: cached.model,
          version: cached.promptVersion,
          purpose: "post_analysis"
        }
      });

      return { ok: true, hash: post.hash, result: cached.result, source: "cache" };
    }
  }

  try {
    await appendDebugLog({
      source: "background",
      event: "cache_miss",
      payload: {
        hash: post.hash,
        platform: post.platform,
        model: settings.model,
        version: PROMPT_VERSION,
        purpose: "post_analysis"
      }
    });
    const result = await callGeminiForPostWithRetry(
      post.text,
      settings,
      apiKey,
      platformLabel(post.platform),
      post.hash,
      post.platform
    );
    const createdAt = new Date().toISOString();

    if (settings.storeCache) {
      await putCacheEntry({
        cacheKey,
        result,
        createdAt,
        model: settings.model,
        promptVersion: PROMPT_VERSION
      });
    }

    await appendDebugLog({
      source: "background",
      event: "analyze_success",
      payload: {
        hash: post.hash,
        platform: post.platform,
        marker: result.marker,
        confidence: result.confidence,
        signalCount: result.signals.length,
        purpose: "post_analysis"
      }
    });

    return { ok: true, hash: post.hash, result, source: "gemini" };
  } catch (error) {
    const normalized = normalizeGeminiError(error);
    await appendDebugLog({
      source: "background",
      severity: normalized.retryable ? "warn" : "error",
      event: "analyze_error",
      payload: {
        hash: post.hash,
        platform: post.platform,
        code: normalized.code,
        retryable: normalized.retryable,
        purpose: "post_analysis"
      }
    });
    return {
      ok: false,
      hash: post.hash,
      error: normalized
    };
  }
}

export { clearCache };

export async function validateGeminiApiKey(
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<ValidateApiKeyResponse> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: { code: "missing_api_key", message: ERROR_MESSAGES.missingApiKey, retryable: false }
    };
  }

  try {
    const settings = await getSettings();
    await callGemini(VALIDATION_POST_TEXT, settings, trimmed, fetchImpl, undefined, {
      purpose: "validation"
    });
    await appendDebugLog({
      source: "gemini",
      event: "key_validation_success",
      payload: { model: settings.model, purpose: "validation" }
    });
    return { ok: true, checkedAt: new Date().toISOString() };
  } catch (error) {
    const normalized = normalizeGeminiError(error);
    await appendDebugLog({
      source: "gemini",
      severity: normalized.retryable ? "warn" : "error",
      event: "key_validation_error",
      payload: { code: normalized.code, retryable: normalized.retryable, purpose: "validation" }
    });
    return {
      ok: false,
      error: {
        ...normalized,
        message:
          normalized.code === "rate_limited"
            ? normalized.message
            : ERROR_MESSAGES.keyValidationFailed
      }
    };
  }
}

export async function callGemini(
  postText: string,
  settings: Awaited<ReturnType<typeof getSettings>>,
  apiKey: string,
  fetchImplOrPlatformLabel: typeof fetch | string = fetch,
  maybePlatformLabel?: string,
  options: GeminiCallOptions = {}
): Promise<AnalysisResult> {
  const fetchImpl =
    typeof fetchImplOrPlatformLabel === "function" ? fetchImplOrPlatformLabel : fetch;
  const requestPlatformLabel =
    typeof fetchImplOrPlatformLabel === "string" ? fetchImplOrPlatformLabel : maybePlatformLabel;
  const model = settings.model.replace(/^models\//, "");
  const attempt = options.attempt ?? 1;
  const maxAttempts = options.maxAttempts ?? 1;
  const purpose = options.purpose ?? "post_analysis";
  const requestStartedAt = nowMs();
  const logContext = {
    model,
    purpose,
    attempt,
    maxAttempts,
    ...(options.hash ? { hash: options.hash } : {}),
    ...(options.platform ? { platform: options.platform } : {})
  };
  await appendDebugLog({
    source: "gemini",
    event: "gemini_request_start",
    payload: { ...logContext, chars: postText.length }
  });
  const response = await fetchImpl(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(buildGeminiRequestBody(postText, settings, requestPlatformLabel))
  });

  if (!response.ok) {
    await appendDebugLog({
      source: "gemini",
      severity: response.status === 429 || response.status >= 500 ? "warn" : "error",
      event: "gemini_http_error",
      payload: { ...logContext, status: response.status, durationMs: elapsedMs(requestStartedAt) }
    });
    throw await geminiHttpError(response);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((part): part is string => Boolean(part))
    .join("")
    .trim();
  const responseDiagnostics = getGeminiResponseDiagnostics(payload, text);

  if (!text) {
    await appendDebugLog({
      source: "gemini",
      severity: "warn",
      event: "gemini_invalid_response",
      payload: {
        model,
        purpose,
        reason: "missing_text",
        attempt,
        maxAttempts,
        durationMs: elapsedMs(requestStartedAt),
        ...(options.hash ? { hash: options.hash } : {}),
        ...(options.platform ? { platform: options.platform } : {}),
        ...responseDiagnostics
      }
    });
    throw new Error("Gemini response did not contain text.");
  }

  try {
    const result = validateAnalysisResult(parseAnalysisJson(text));
    await appendDebugLog({
      source: "gemini",
      event: "gemini_success",
      payload: {
        model,
        purpose,
        attempt,
        maxAttempts,
        durationMs: elapsedMs(requestStartedAt),
        ...(options.hash ? { hash: options.hash } : {}),
        ...(options.platform ? { platform: options.platform } : {}),
        marker: result.marker,
        confidence: result.confidence,
        signalCount: result.signals.length
      }
    });
    return result;
  } catch (error) {
    await appendDebugLog({
      source: "gemini",
      severity: "warn",
      event: "gemini_invalid_response",
      payload: {
        model,
        purpose,
        reason: error instanceof Error ? error.name || "validation_error" : "validation_error",
        attempt,
        maxAttempts,
        durationMs: elapsedMs(requestStartedAt),
        ...(options.hash ? { hash: options.hash } : {}),
        ...(options.platform ? { platform: options.platform } : {}),
        ...getInvalidResponseDiagnostics(error, responseDiagnostics)
      }
    });
    const invalid = new Error(
      error instanceof Error ? error.message : "Gemini returned invalid JSON."
    );
    invalid.name = "InvalidGeminiResponseError";
    throw invalid;
  }
}

async function callGeminiForPostWithRetry(
  postText: string,
  settings: Awaited<ReturnType<typeof getSettings>>,
  apiKey: string,
  requestPlatformLabel: string,
  hash: string,
  platform: SupportedPlatformId
): Promise<AnalysisResult> {
  for (let attempt = 1; attempt <= POST_ANALYSIS_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await callGemini(postText, settings, apiKey, requestPlatformLabel, undefined, {
        attempt,
        maxAttempts: POST_ANALYSIS_MAX_ATTEMPTS,
        hash,
        platform,
        purpose: "post_analysis"
      });
    } catch (error) {
      if (attempt < POST_ANALYSIS_MAX_ATTEMPTS && isInvalidGeminiResponseError(error)) {
        await appendDebugLog({
          source: "background",
          severity: "warn",
          event: "analyze_retry",
          payload: {
            hash,
            platform,
            code: "invalid_response",
            attempt,
            nextAttempt: attempt + 1,
            maxAttempts: POST_ANALYSIS_MAX_ATTEMPTS,
            purpose: "post_analysis"
          }
        });
        continue;
      }

      throw error;
    }
  }

  throw new Error("Gemini retry loop ended unexpectedly.");
}

async function geminiHttpError(response: Response): Promise<Error & { status?: number }> {
  let message: string = ERROR_MESSAGES.providerError;
  try {
    const payload = (await response.json()) as GeminiErrorResponse;
    if (payload.error?.message) {
      message = payload.error.message;
    }
  } catch {
    // Keep the generic provider message.
  }

  const error = new Error(message) as Error & { status?: number };
  error.status = response.status;
  return error;
}

function normalizeGeminiError(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : undefined;

  if (status === 429) {
    return { code: "rate_limited" as const, message: ERROR_MESSAGES.rateLimited, retryable: true };
  }

  if (
    error instanceof SyntaxError ||
    isInvalidGeminiResponseError(error)
  ) {
    return {
      code: "invalid_response" as const,
      message: ERROR_MESSAGES.invalidResponse,
      retryable: true
    };
  }

  return {
    code: "provider_error" as const,
    message: ERROR_MESSAGES.providerError,
    retryable: status ? status >= 500 : true
  };
}

function isInvalidGeminiResponseError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "InvalidGeminiResponseError" ||
      error.message.includes("did not contain text"))
  );
}

function getGeminiResponseDiagnostics(
  payload: GeminiGenerateContentResponse,
  text: string | undefined
): Record<string, string | number | boolean> {
  const firstCandidate = payload.candidates?.[0];
  const candidateSafetyRatingCount = countArray(firstCandidate?.safetyRatings);
  const promptSafetyRatingCount = countArray(payload.promptFeedback?.safetyRatings);

  return {
    candidateCount: countArray(payload.candidates),
    partCount: countArray(firstCandidate?.content?.parts),
    finishReason: firstCandidate?.finishReason ?? "unknown",
    safetyRatingCount: candidateSafetyRatingCount + promptSafetyRatingCount,
    promptBlockReason: payload.promptFeedback?.blockReason ?? "none",
    ...getAnalysisJsonDiagnostics(text)
  };
}

function getInvalidResponseDiagnostics(
  error: unknown,
  diagnostics: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  if (!(error instanceof SyntaxError)) {
    return { ...diagnostics, parseCategory: "validation_error" };
  }

  return diagnostics;
}

function countArray(value: unknown[] | undefined): number {
  return Array.isArray(value) ? value.length : 0;
}

function nowMs(): number {
  return performance.now();
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(nowMs() - startedAt));
}
