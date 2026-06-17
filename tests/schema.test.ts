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
