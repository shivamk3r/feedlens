import { describe, expect, it } from "vitest";
import {
  getAnalysisJsonDiagnostics,
  parseAnalysisJson,
  validateAnalysisResult
} from "../src/shared/schema";

const validResult = {
  marker: "yellow",
  confidence: "medium",
  information_quality_score: 45,
  misinformation_risk_score: 35,
  manipulation_pressure_score: 20,
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
      information_quality_score: "45",
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

  it("normalizes component scores to an exact 100-point signal mix", () => {
    expect(
      validateAnalysisResult({
        ...validResult,
        information_quality_score: 28,
        misinformation_risk_score: 76,
        manipulation_pressure_score: 82
      })
    ).toMatchObject({
      information_quality_score: 15,
      misinformation_risk_score: 41,
      manipulation_pressure_score: 44,
      overall_risk_score: 40
    });
  });

  it("rejects all-zero component scores", () => {
    expect(() =>
      validateAnalysisResult({
        ...validResult,
        information_quality_score: 0,
        misinformation_risk_score: 0,
        manipulation_pressure_score: 0
      })
    ).toThrow(/Component scores/);
  });

  it("classifies sanitized JSON response-shape diagnostics", () => {
    expect(getAnalysisJsonDiagnostics("   ")).toMatchObject({
      hasText: false,
      textLength: 0,
      parseCategory: "missing_text"
    });

    expect(getAnalysisJsonDiagnostics("I cannot produce that response.")).toMatchObject({
      hasBalancedObject: false,
      parseCategory: "no_json_object"
    });

    expect(getAnalysisJsonDiagnostics(`\`\`\`json\n${JSON.stringify(validResult)}\n\`\`\``)).toMatchObject({
      hasJsonFence: true,
      hasBalancedObject: true,
      parseCategory: "json_fence"
    });

    expect(getAnalysisJsonDiagnostics('{"marker":"red"')).toMatchObject({
      startsWithJsonObject: true,
      endsWithJsonObject: false,
      parseCategory: "likely_truncated"
    });
  });
});
