import { ERROR_MESSAGES } from "../shared/defaults";
import { createCacheKey } from "../shared/hash";
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
import { PROMPT_VERSION, type AnalyzePostRequest, type AnalyzePostResponse } from "../shared/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

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
  const settings = await getSettings();

  if (!settings.enabled) {
    return {
      ok: false,
      hash: post.hash,
      error: { code: "disabled", message: ERROR_MESSAGES.disabled, retryable: true }
    };
  }

  if (!settings.privacyAccepted) {
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
    return {
      ok: false,
      hash: post.hash,
      error: { code: "missing_api_key", message: ERROR_MESSAGES.missingApiKey, retryable: false }
    };
  }

  const cacheKey = await createCacheKey(post.text, settings.model, PROMPT_VERSION);
  if (settings.storeCache && !force) {
    const cached = await getCacheEntry(cacheKey);
    if (cached) {
      await putSessionResult({
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
    const result = await callGemini(post.text, settings, apiKey);
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

    return { ok: true, hash: post.hash, result, source: "gemini" };
  } catch (error) {
    return {
      ok: false,
      hash: post.hash,
      error: normalizeGeminiError(error)
    };
  }
}

export { clearCache };

export async function callGemini(
  postText: string,
  settings: Awaited<ReturnType<typeof getSettings>>,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
) {
  const model = settings.model.replace(/^models\//, "");
  const response = await fetchImpl(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(buildGeminiRequestBody(postText, settings))
  });

  if (!response.ok) {
    throw await geminiHttpError(response);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((part): part is string => Boolean(part))
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini response did not contain text.");
  }

  return validateAnalysisResult(parseAnalysisJson(text));
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

  if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("must be"))) {
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
