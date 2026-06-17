import { analysisResponseSchema } from "./schema";
import type { FeedLensSettings } from "./types";

const geminiResponseSchema = stripUnsupportedGeminiSchema(analysisResponseSchema);

export const SYSTEM_PROMPT = `You are Feed Lens, a careful assistant that analyzes LinkedIn post text for information quality, misinformation risk, and manipulation or persuasion signals.

Rules:
- Analyze only the supplied post text.
- Do not judge the author, infer intent, diagnose anyone, or use defamatory language.
- Frame misinformation as risk unless the post text itself gives enough evidence for a stronger conclusion.
- Distinguish ordinary persuasion or motivation from manipulative pressure.
- Avoid over-scoring harmless motivational content.
- Be politically and ideologically neutral.
- Quote only the shortest relevant evidence phrase.
- Return only JSON that matches the provided schema.`;

export function buildUserPrompt(postText: string, settings: FeedLensSettings): string {
  return `Analyze this visible LinkedIn post for Feed Lens.

Analysis depth: ${settings.analysisDepth}
Sensitivity: ${settings.sensitivity}

Marker guidance:
- Green: high-quality information, low misinformation risk, and low manipulation pressure.
- Yellow: mixed, ambiguous, unsupported, or uncertain content that should be read carefully.
- Red: high misinformation risk, strong manipulation pressure, fear, shame, status anxiety, artificial urgency, or self-worth pressure.

Score guidance:
- information_quality_score: 0-100, higher means more useful, specific, supported, and nuanced.
- misinformation_risk_score: 0-100, higher means more unsupported, misleading, unverifiable, or overconfident.
- manipulation_pressure_score: 0-100, higher means more psychological pressure or emotional steering.
- overall_risk_score: 0-100, derived from misinformation risk and manipulation pressure.

Post text:
${postText}`;
}

export function buildGeminiRequestBody(postText: string, settings: FeedLensSettings): object {
  return {
    systemInstruction: {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildUserPrompt(postText, settings) }]
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
