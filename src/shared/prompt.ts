import { analysisResponseSchema } from "./schema";
import type { FeedLensSettings } from "./types";

const geminiResponseSchema = stripUnsupportedGeminiSchema(analysisResponseSchema);

export const SYSTEM_PROMPT = `You are FeedLens, a careful assistant that analyzes visible social post text for information quality, misinformation risk, and manipulation or persuasion signals.

Rules:
- Analyze only the supplied post text.
- Do not judge the author, infer intent, diagnose anyone, or use defamatory language.
- Frame misinformation as risk unless the post text itself gives enough evidence for a stronger conclusion.
- Distinguish ordinary persuasion or motivation from manipulative pressure.
- Avoid over-scoring harmless motivational content.
- Be politically and ideologically neutral.
- Quote only the shortest relevant evidence phrase.
- For recent or fast-moving news claims, do not treat novelty, surprise, or lack of model knowledge as evidence that the claim is false.
- When a recent factual claim is unsourced, frame it as needing current-source verification unless the supplied post text itself supports a stronger risk call.
- Return only JSON that matches the provided schema.`;

export function buildUserPrompt(
  postText: string,
  settings: FeedLensSettings,
  platformLabel = "supported platform"
): string {
  return `Analyze this visible social post for FeedLens.

Platform: ${platformLabel}

Analysis depth: ${settings.analysisDepth}
Sensitivity: ${settings.sensitivity}

Marker guidance:
- Green: high-quality information, low misinformation risk, and low manipulation pressure.
- Yellow: mixed, ambiguous, unsupported, or uncertain content that should be read carefully.
- Red: high misinformation risk, strong manipulation pressure, fear, shame, status anxiety, artificial urgency, or self-worth pressure.

Score guidance:
- information_quality_score: 0-100 signal-mix share for useful, specific, supported, and nuanced information.
- misinformation_risk_score: 0-100 signal-mix share for unsupported, misleading, unverifiable, or overconfident claims.
- manipulation_pressure_score: 0-100 signal-mix share for psychological pressure or emotional steering.
- The three signal-mix scores above must be integers that add up to exactly 100.
- overall_risk_score: separate 0-100 overall risk rating derived from misinformation risk and manipulation pressure. Do not include it in the signal-mix sum.

Recency guidance:
- The post may discuss events newer than your model knowledge.
- Do not say a recent event has no credible coverage, no public records, or is likely false only because it is surprising or absent from your knowledge.
- If the text does not provide sources for a recent factual claim, prefer an uncertainty or missing-evidence explanation and suggest checking current sources.
- Use a high misinformation-risk score only when the post text itself contains clear red flags such as contradictions, impossible details, fabricated certainty, or misleading framing.

Post text:
${postText}`;
}

export function buildGeminiRequestBody(
  postText: string,
  settings: FeedLensSettings,
  platformLabel?: string
): object {
  return {
    systemInstruction: {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildUserPrompt(postText, settings, platformLabel) }]
      }
    ],
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.maxOutputTokens,
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema
    }
  };
}

function stripUnsupportedGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUnsupportedGeminiSchema);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "additionalProperties")
      .map(([key, nested]) => [key, stripUnsupportedGeminiSchema(nested)])
  );
}
