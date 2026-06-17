import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePost, callGemini } from "../src/background/gemini";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import { saveApiKey, saveSettings } from "../src/shared/storage";
import type { AnalysisResult, ExtractedPost } from "../src/shared/types";

const validAnalysis: AnalysisResult = {
  marker: "red",
  confidence: "medium",
  information_quality_score: 28,
  misinformation_risk_score: 76,
  manipulation_pressure_score: 82,
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
  postId: "urn:li:activity:1",
  hash: "abc123",
  text: "Act now or your career will fall behind. Top performers all use this system.",
  detectedAt: new Date("2026-06-17T00:00:00.000Z").toISOString()
};

describe("Gemini analysis service", () => {
  beforeEach(async () => {
    await saveSettings({ privacyAccepted: true });
    await saveApiKey("gemini-test-key", "session");
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
    expect(String(url)).toContain("/models/gemini-2.5-flash:generateContent");
    expect(String(url)).not.toContain("secret-key");
    expect((init as RequestInit).headers).toMatchObject({ "x-goog-api-key": "secret-key" });

    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.generationConfig.responseFormat.text.mimeType).toBe("application/json");
    expect(body.contents[0].parts[0].text).toContain("Analyze this visible LinkedIn post");
  });

  it("maps Gemini rate limits to a retryable Feed Lens error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: { message: "quota exceeded" } }, { status: 429 })
      )
    );

    const response = await analyzePost({ post, force: true });
    expect(response).toMatchObject({
      ok: false,
      error: { code: "rate_limited", retryable: true }
    });
  });

  it("rejects invalid model JSON as an invalid response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ marker: "red" }) }] } }]
        })
      )
    );

    const response = await analyzePost({ post, force: true });
    expect(response).toMatchObject({
      ok: false,
      error: { code: "invalid_response", retryable: true }
    });
  });
});
