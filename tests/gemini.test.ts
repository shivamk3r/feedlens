import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePost, callGemini, validateGeminiApiKey } from "../src/background/gemini";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import { getDebugLogs } from "../src/shared/debug";
import { saveApiKey, saveSettings } from "../src/shared/storage";
import type { AnalysisResult, ExtractedPost } from "../src/shared/types";

const validAnalysis: AnalysisResult = {
  marker: "red",
  confidence: "medium",
  information_quality_score: 15,
  misinformation_risk_score: 41,
  manipulation_pressure_score: 44,
  overall_risk_score: 79,
  summary: "The post relies on urgency and unsupported broad claims.",
  signals: [
    {
      type: "artificial_urgency",
      severity: "high",
      evidence: "act now",
      explanation: "The phrase pushes immediate action without support."
    }
  ],
  counter_reading: "It could be promotional shorthand rather than deliberate pressure.",
  suggested_user_action: "Read critically and look for evidence."
};

const post: ExtractedPost = {
  platform: "linkedin",
  postId: "urn:li:activity:1",
  hash: "abc123",
  text: "Act now or your career will fall behind. Top performers all use this system.",
  detectedAt: new Date("2026-06-17T00:00:00.000Z").toISOString()
};

describe("Gemini analysis service", () => {
  beforeEach(async () => {
    await saveSettings({ privacyAccepted: true });
    await saveApiKey("gemini-test-key");
  });

  it("sends structured-output requests with the key in a header", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(validAnalysis) }] } }]
      })
    );

    const result = await callGemini("Post text", DEFAULT_SETTINGS, "secret-key", fetchImpl);

    expect(result).toEqual(validAnalysis);
    const [url, init] = fetchImpl.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(String(url)).toContain("/models/gemini-3.5-flash:generateContent");
    expect(String(url)).not.toContain("secret-key");
    expect((init as RequestInit).headers).toMatchObject({ "x-goog-api-key": "secret-key" });

    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema).toBeTruthy();
    expect(JSON.stringify(body.generationConfig.responseSchema)).not.toContain(
      "additionalProperties"
    );
    expect(body.generationConfig.responseFormat).toBeUndefined();
    expect(body.contents[0].parts[0].text).toContain("Analyze this visible social post");
  });

  it("maps Gemini rate limits to a retryable FeedLens error", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ error: { message: "quota exceeded" } }, { status: 429 })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const response = await analyzePost({ post, force: true });
    expect(response).toMatchObject({
      ok: false,
      error: { code: "rate_limited", retryable: true }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid model JSON as an invalid response", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            safetyRatings: [{}],
            content: { parts: [{ text: JSON.stringify({ marker: "red" }) }] }
          }
        ],
        promptFeedback: { blockReason: "none", safetyRatings: [{}] }
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const response = await analyzePost({ post, force: true });
    expect(response).toMatchObject({
      ok: false,
      error: { code: "invalid_response", retryable: true }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const invalidLog = (await getDebugLogs()).find(
      (log) => log.event === "gemini_invalid_response"
    );
    expect(invalidLog?.payload).toMatchObject({
      attempt: 2,
      maxAttempts: 2,
      candidateCount: 1,
      partCount: 1,
      finishReason: "STOP",
      safetyRatingCount: 2,
      promptBlockReason: "none",
      textLength: JSON.stringify({ marker: "red" }).length,
      hasText: true,
      hasBalancedObject: true,
      parseCategory: "validation_error"
    });
    const serializedLogs = JSON.stringify(await getDebugLogs());
    expect(serializedLogs).not.toContain(post.text);
    expect(serializedLogs).not.toContain("gemini-test-key");
    expect(serializedLogs).not.toContain(validAnalysis.summary);
    expect(serializedLogs).not.toContain(validAnalysis.signals[0]?.evidence);
  });

  it("retries once when Gemini returns malformed JSON and then succeeds", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            {
              finishReason: "MAX_TOKENS",
              content: { parts: [{ text: '{"marker":"red"' }] }
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          candidates: [{ content: { parts: [{ text: JSON.stringify(validAnalysis) }] } }]
        })
      );
    vi.stubGlobal("fetch", fetchImpl);

    const response = await analyzePost({ post, force: true });

    expect(response).toMatchObject({
      ok: true,
      result: validAnalysis
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const logs = await getDebugLogs();
    expect(logs.find((log) => log.event === "analyze_retry")?.payload).toMatchObject({
      hash: post.hash,
      code: "invalid_response",
      attempt: 1,
      nextAttempt: 2,
      maxAttempts: 2
    });
    expect(logs.find((log) => log.event === "gemini_success")?.payload).toMatchObject({
      attempt: 2,
      maxAttempts: 2
    });
  });

  it("validates a Gemini key with a synthetic structured analysis request", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(validAnalysis) }] } }]
      })
    );

    const response = await validateGeminiApiKey(" candidate-key ", fetchImpl);

    expect(response).toMatchObject({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(String(url)).toContain("/models/gemini-3.5-flash:generateContent");
    expect(String(url)).not.toContain("candidate-key");
    expect((init as RequestInit).headers).toMatchObject({ "x-goog-api-key": "candidate-key" });
    expect(String((init as RequestInit).body)).toContain("FeedLens connection check");
  });

  it("returns a sanitized failure when a Gemini key cannot be used", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { message: "raw provider detail that may include sensitive context" } },
        { status: 403 }
      )
    );

    const response = await validateGeminiApiKey("bad-key", fetchImpl);

    expect(response).toMatchObject({
      ok: false,
      error: {
        code: "provider_error",
        message:
          "Gemini could not use this API key. Check the key, billing status, project access, or rate limits.",
        retryable: false
      }
    });
  });
});
