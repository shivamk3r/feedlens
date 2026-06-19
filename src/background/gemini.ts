import { appendDebugLog } from "../shared/debug";
import { ERROR_MESSAGES } from "../shared/defaults";
import { createCacheKey } from "../shared/hash";
import { platformLabel } from "../shared/platforms";
import { buildGeminiRequestBody } from "../shared/prompt";
import { parseAnalysisJson, validateAnalysisResult } from "../shared/schema";
import {
  clearCache,
  getApiKey,
  getCacheEntry,
  getSettings,
  putCacheEntry,
  putSessionResult
} from "../shared/storage";
import {
  PROMPT_VERSION,
  type AnalyzePostRequest,
  type AnalyzePostResponse,
  type ValidateApiKeyResponse
} from "../shared/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const VALIDATION_POST_TEXT =
  "FeedLens connection check: A team shared a neutral project update with two specific results and no urgent claim.";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface GeminiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export async function analyzePost({
  post,
  force = false
}: AnalyzePostRequest): Promise<AnalyzePostResponse> {
  await appendDebugLog({
    source: "background",
    event: "analyze_start",
    payload: { hash: post.hash, force }
  });

  const settings = await getSettings();

  if (!settings.enabled) {
    await appendDebugLog({
      source: "background",
      severity: "warn",
      event: "analyze_blocked",
      payload: { hash: post.hash, code: "disabled" }
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
      payload: { hash: post.hash, code: "privacy_not_accepted" }
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
      payload: { hash: post.hash, code: "missing_api_key" }
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
        payload: { hash: post.hash, model: cached.model, version: cached.promptVersion }
      });
      await putSessionResult({
        platform: post.platform,
        hash: post.hash,
        postId: post.postId,
        snippet: makeSnippet(post.text),
        author: post.author,
        url: post.url,
        result: cached.result,
        createdAt: new Date().toISOString(),
        model: cached.model,
        promptVersion: cached.promptVersion,
        source: "cache"
      });

      return { ok: true, hash: post.hash, result: cached.result, source: "cache" };
    }
  }

  try {
    await appendDebugLog({
      source: "background",
      event: "cache_miss",
      payload: { hash: post.hash, model: settings.model, version: PROMPT_VERSION }
    });
    const result = await callGemini(post.text, settings, apiKey, platformLabel(post.platform));
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

    await putSessionResult({
      platform: post.platform,
      hash: post.hash,
      postId: post.postId,
      snippet: makeSnippet(post.text),
      author: post.author,
      url: post.url,
      result,
      createdAt,
      model: settings.model,
      promptVersion: PROMPT_VERSION,
      source: "gemini"
    });

    await appendDebugLog({
      source: "background",
      event: "analyze_success",
      payload: {
        hash: post.hash,
        marker: result.marker,
        confidence: result.confidence,
        signalCount: result.signals.length
      }
    });

    return { ok: true, hash: post.hash, result, source: "gemini" };
  } catch (error) {
    const normalized = normalizeGeminiError(error);
    await appendDebugLog({
      source: "background",
      severity: normalized.retryable ? "warn" : "error",
      event: "analyze_error",
      payload: { hash: post.hash, code: normalized.code, retryable: normalized.retryable }
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
    await callGemini(VALIDATION_POST_TEXT, settings, trimmed, fetchImpl);
    await appendDebugLog({
      source: "gemini",
      event: "key_validation_success",
      payload: { model: settings.model }
    });
    return { ok: true, checkedAt: new Date().toISOString() };
  } catch (error) {
    const normalized = normalizeGeminiError(error);
    await appendDebugLog({
      source: "gemini",
      severity: normalized.retryable ? "warn" : "error",
      event: "key_validation_error",
      payload: { code: normalized.code, retryable: normalized.retryable }
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
  maybePlatformLabel?: string
) {
  const fetchImpl =
    typeof fetchImplOrPlatformLabel === "function" ? fetchImplOrPlatformLabel : fetch;
  const requestPlatformLabel =
    typeof fetchImplOrPlatformLabel === "string" ? fetchImplOrPlatformLabel : maybePlatformLabel;
  const model = settings.model.replace(/^models\//, "");
  await appendDebugLog({
    source: "gemini",
    event: "gemini_request_start",
    payload: { model, chars: postText.length }
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
      payload: { model, status: response.status }
    });
    throw await geminiHttpError(response);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((part): part is string => Boolean(part))
    .join("")
    .trim();

  if (!text) {
    await appendDebugLog({
      source: "gemini",
      severity: "warn",
      event: "gemini_invalid_response",
      payload: { model, reason: "missing_text" }
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
        reason: error instanceof Error ? error.name || "validation_error" : "validation_error"
      }
    });
    const invalid = new Error(
      error instanceof Error ? error.message : "Gemini returned invalid JSON."
    );
    invalid.name = "InvalidGeminiResponseError";
    throw invalid;
  }
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
    (error instanceof Error && error.name === "InvalidGeminiResponseError")
  ) {
    return {
      code: "invalid_response" as const,
      message: ERROR_MESSAGES.invalidResponse,
      retryable: true
    };
  }

  if (error instanceof Error && error.message.includes("did not contain text")) {
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

function makeSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}
