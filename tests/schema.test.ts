import { describe, expect, it } from "vitest";
import { parseAnalysisJson, validateAnalysisResult } from "../src/shared/schema";

const validResult = {
  marker: "yellow",
  confidence: "medium",
  information_quality_score: 61,
  misinformation_risk_score: 42,
  manipulation_pressure_score: 38,
  overall_risk_score: 40,
  summary: "The post has useful ideas but limited evidence.",
  signals: [
    {
      type: "missing_evidence",
      severity: "medium",
      evidence: "everyone should do this",
      explanation: "The phrase is broad and does not provide support."
    }
  ],
  counter_reading: "It may be a concise motivational post rather than a factual argument.",
  suggested_user_action: "Look for concrete examples before relying on the claim."
};

describe("analysis schema validation", () => {
  it("parses fenced JSON and normalizes a valid analysis result", () => {
    const parsed = parseAnalysisJson(`\n\`\`\`json\n${JSON.stringify(validResult)}\n\`\`\``);
    expect(validateAnalysisResult(parsed)).toEqual(validResult);
  });

  it("parses a JSON object from wrapped Gemini text", () => {
    const parsed = parseAnalysisJson(
      `Here is the FeedLens analysis:\n\`\`\`json\n${JSON.stringify(validResult)}\n\`\`\`\nDone.`
    );

    expect(validateAnalysisResult(parsed)).toEqual(validResult);
  });

  it("normalizes harmless enum casing and numeric score strings", () => {
    const parsed = validateAnalysisResult({
      ...validResult,
      marker: "Yellow",
      confidence: "Medium",
      information_quality_score: "61",
      signals: [
        {
          type: "Missing Evidence",
          severity: "Medium",
          evidence: "everyone should do this",
          explanation: "The phrase is broad and does not provide support."
        },
        {
          type: "unsupported_claims",
          severity: "medium",
          evidence: "top performers",
          explanation: "This alias is not part of the FeedLens schema."
        }
      ]
    });

    expect(parsed).toEqual(validResult);
  });

  it("accepts otherwise valid results without signal objects", () => {
    expect(validateAnalysisResult({ ...validResult, signals: undefined })).toEqual({
      ...validResult,
      signals: []
    });
  });

  it("rejects unsupported markers", () => {
    expect(() => validateAnalysisResult({ ...validResult, marker: "dangerous" })).toThrow(
      /marker/
    );
  });

  it("rejects out-of-range scores", () => {
    expect(() =>
      validateAnalysisResult({ ...validResult, misinformation_risk_score: 101 })
    ).toThrow(/misinformation_risk_score/);
  });
});
