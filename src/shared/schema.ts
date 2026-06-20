import type {
  AnalysisResult,
  AnalysisSignal,
  Confidence,
  Marker,
  Severity,
  SignalType
} from "./types";

const markers = new Set<Marker>(["green", "yellow", "red"]);
const confidences = new Set<Confidence>(["low", "medium", "high"]);
const severities = new Set<Severity>(["low", "medium", "high"]);
const signalTypes = new Set<SignalType>([
  "information_quality",
  "missing_evidence",
  "misinformation_risk",
  "fear_threat_framing",
  "artificial_urgency",
  "status_anxiety",
  "self_worth_pressure",
  "authority_signaling",
  "social_proof_pressure",
  "engagement_bait",
  "false_binary",
  "overgeneralization",
  "vague_promise",
  "emotional_storytelling"
]);

export type AnalysisJsonParseCategory =
  | "missing_text"
  | "no_json_object"
  | "likely_truncated"
  | "json_fence"
  | "syntax_error"
  | "json_object";

export interface AnalysisJsonDiagnostics {
  textLength: number;
  hasText: boolean;
  hasBalancedObject: boolean;
  hasJsonFence: boolean;
  startsWithJsonObject: boolean;
  endsWithJsonObject: boolean;
  parseCategory: AnalysisJsonParseCategory;
}

export const analysisResponseSchema = {
  type: "object",
  additionalProperties: false,
  propertyOrdering: [
    "marker",
    "confidence",
    "information_quality_score",
    "misinformation_risk_score",
    "manipulation_pressure_score",
    "overall_risk_score",
    "summary",
    "signals",
    "counter_reading",
    "suggested_user_action"
  ],
  properties: {
    marker: {
      type: "string",
      enum: ["green", "yellow", "red"],
      description: "Overall calm marker for the post."
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Confidence in the assessment, not a truth claim."
    },
    information_quality_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description:
        "Normalized signal-mix share for useful, specific, supported, and nuanced information. This plus misinformation_risk_score and manipulation_pressure_score must equal 100."
    },
    misinformation_risk_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description:
        "Normalized signal-mix share for unsupported, misleading, unverifiable, or overconfident claims. This plus information_quality_score and manipulation_pressure_score must equal 100."
    },
    manipulation_pressure_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description:
        "Normalized signal-mix share for psychological pressure or emotional steering. This plus information_quality_score and misinformation_risk_score must equal 100."
    },
    overall_risk_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description:
        "Separate 0-100 overall risk score derived from misinformation risk and manipulation pressure; not included in the normalized signal mix."
    },
    summary: {
      type: "string",
      description: "Brief explanation of the marker."
    },
    signals: {
      type: "array",
      description: "Detected signal evidence from the post text.",
      items: {
        type: "object",
        additionalProperties: false,
        propertyOrdering: ["type", "severity", "evidence", "explanation"],
        properties: {
          type: {
            type: "string",
            enum: Array.from(signalTypes),
            description: "Signal category."
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Signal strength."
          },
          evidence: {
            type: "string",
            description: "Shortest relevant phrase from the post."
          },
          explanation: {
            type: "string",
            description: "Why the phrase matters."
          }
        },
        required: ["type", "severity", "evidence", "explanation"]
      }
    },
    counter_reading: {
      type: "string",
      description: "Fair alternative interpretation or uncertainty."
    },
    suggested_user_action: {
      type: "string",
      description: "Calm next step for the reader."
    }
  },
  required: [
    "marker",
    "confidence",
    "information_quality_score",
    "misinformation_risk_score",
    "manipulation_pressure_score",
    "overall_risk_score",
    "summary",
    "signals",
    "counter_reading",
    "suggested_user_action"
  ]
} as const;

export function parseAnalysisJson(text: string): unknown {
  const candidates = getJsonCandidates(text);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new SyntaxError("No valid JSON object found.");
}

export function getAnalysisJsonDiagnostics(text: string | undefined): AnalysisJsonDiagnostics {
  const trimmed = text?.trim() ?? "";
  const hasText = trimmed.length > 0;
  const hasJsonFence = /```(?:json)?\s*[\s\S]*?```/i.test(trimmed);
  const startsWithJsonObject = trimmed.startsWith("{");
  const endsWithJsonObject = trimmed.endsWith("}");
  const hasBalancedObject = Boolean(findFirstBalancedJsonObject(trimmed));

  return {
    textLength: trimmed.length,
    hasText,
    hasBalancedObject,
    hasJsonFence,
    startsWithJsonObject,
    endsWithJsonObject,
    parseCategory: getParseCategory({
      hasText,
      hasBalancedObject,
      hasJsonFence,
      startsWithJsonObject,
      endsWithJsonObject,
      text: trimmed
    })
  };
}

export function validateAnalysisResult(value: unknown): AnalysisResult {
  if (!isRecord(value)) {
    throw new Error("Analysis result must be an object.");
  }

  const marker = requireEnum(value.marker, markers, "marker");
  const confidence = requireEnum(value.confidence, confidences, "confidence");
  const rawSignals =
    value.signals === undefined || value.signals === null
      ? []
      : Array.isArray(value.signals)
        ? value.signals
        : fail("signals must be an array.");
  const signals = rawSignals.flatMap((signal) => {
    try {
      return [validateSignal(signal)];
    } catch {
      return [];
    }
  }).slice(0, 12);
  const [informationQualityScore, misinformationRiskScore, manipulationPressureScore] =
    normalizeComponentScores([
      requireScore(value.information_quality_score, "information_quality_score"),
      requireScore(value.misinformation_risk_score, "misinformation_risk_score"),
      requireScore(value.manipulation_pressure_score, "manipulation_pressure_score")
    ]);

  return {
    marker,
    confidence,
    information_quality_score: informationQualityScore,
    misinformation_risk_score: misinformationRiskScore,
    manipulation_pressure_score: manipulationPressureScore,
    overall_risk_score: requireScore(value.overall_risk_score, "overall_risk_score"),
    summary: requireString(value.summary, "summary", 500),
    signals,
    counter_reading: requireString(value.counter_reading, "counter_reading", 700),
    suggested_user_action: requireString(value.suggested_user_action, "suggested_user_action", 500)
  };
}

function validateSignal(value: unknown): AnalysisSignal {
  if (!isRecord(value)) {
    throw new Error("Signal must be an object.");
  }

  return {
    type: requireEnum(value.type, signalTypes, "signal.type"),
    severity: requireEnum(value.severity, severities, "signal.severity"),
    evidence: requireString(value.evidence, "signal.evidence", 240),
    explanation: requireString(value.explanation, "signal.explanation", 500)
  };
}

function requireScore(value: unknown, label: string): number {
  const numericValue =
    typeof value === "string" && value.trim() ? Number(value.trim()) : value;

  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    throw new Error(`${label} must be a number.`);
  }

  const rounded = Math.round(numericValue);
  if (rounded < 0 || rounded > 100) {
    throw new Error(`${label} must be between 0 and 100.`);
  }

  return rounded;
}

function normalizeComponentScores(scores: number[]): [number, number, number] {
  const total = scores.reduce((sum, score) => sum + score, 0);

  if (total <= 0) {
    throw new Error("Component scores must have a positive total.");
  }

  if (total === 100) {
    return scores as [number, number, number];
  }

  const exactShares = scores.map((score) => (score / total) * 100);
  const normalized = exactShares.map(Math.floor);
  const remaining = 100 - normalized.reduce((sum, score) => sum + score, 0);
  const rankedRemainders = exactShares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (let index = 0; index < remaining; index += 1) {
    const scoreIndex = rankedRemainders[index]?.index;
    if (scoreIndex === undefined) {
      break;
    }
    normalized[scoreIndex] = (normalized[scoreIndex] ?? 0) + 1;
  }

  return normalized as [number, number, number];
}

function requireString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must not be empty.`);
  }

  return trimmed.slice(0, maxLength);
}

function requireEnum<T extends string>(value: unknown, allowed: Set<T>, label: string): T {
  if (typeof value !== "string") {
    throw new Error(`${label} has an unsupported value.`);
  }

  if (allowed.has(value as T)) {
    return value as T;
  }

  const normalized = normalizeEnumValue(value);
  if (allowed.has(normalized as T)) {
    return normalized as T;
  }

  throw new Error(`${label} has an unsupported value.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(message);
}

function getJsonCandidates(text: string): string[] {
  const trimmed = text.trim();
  const candidates = [trimmed];

  for (const match of trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    candidates.push(match[1]?.trim() ?? "");
  }

  candidates.push(
    trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
  );

  const balancedObject = findFirstBalancedJsonObject(trimmed);
  if (balancedObject) {
    candidates.push(balancedObject);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function findFirstBalancedJsonObject(text: string): string | undefined {
  const start = text.indexOf("{");
  if (start === -1) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return undefined;
}

function getParseCategory({
  hasText,
  hasBalancedObject,
  hasJsonFence,
  startsWithJsonObject,
  endsWithJsonObject,
  text
}: {
  hasText: boolean;
  hasBalancedObject: boolean;
  hasJsonFence: boolean;
  startsWithJsonObject: boolean;
  endsWithJsonObject: boolean;
  text: string;
}): AnalysisJsonParseCategory {
  if (!hasText) {
    return "missing_text";
  }

  if (!text.includes("{")) {
    return "no_json_object";
  }

  if (!hasBalancedObject && (startsWithJsonObject || hasJsonFence) && !endsWithJsonObject) {
    return "likely_truncated";
  }

  if (hasJsonFence) {
    return "json_fence";
  }

  if (hasBalancedObject) {
    return "json_object";
  }

  return "syntax_error";
}

function normalizeEnumValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
