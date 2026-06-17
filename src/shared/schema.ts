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
      description: "Higher means more useful, specific, supported, and nuanced."
    },
    misinformation_risk_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Higher means more unsupported, misleading, unverifiable, or overconfident."
    },
    manipulation_pressure_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Higher means more psychological pressure or emotional steering."
    },
    overall_risk_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Derived from misinformation risk and manipulation pressure."
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
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(withoutFence);
}

export function validateAnalysisResult(value: unknown): AnalysisResult {
  if (!isRecord(value)) {
    throw new Error("Analysis result must be an object.");
  }

  const marker = requireEnum(value.marker, markers, "marker");
  const confidence = requireEnum(value.confidence, confidences, "confidence");
  const signals = Array.isArray(value.signals)
    ? value.signals.map(validateSignal).slice(0, 12)
    : fail("signals must be an array.");

  return {
    marker,
    confidence,
    information_quality_score: requireScore(value.information_quality_score, "information_quality_score"),
    misinformation_risk_score: requireScore(
      value.misinformation_risk_score,
      "misinformation_risk_score"
    ),
    manipulation_pressure_score: requireScore(
      value.manipulation_pressure_score,
      "manipulation_pressure_score"
    ),
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
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a number.`);
  }

  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 100) {
    throw new Error(`${label} must be between 0 and 100.`);
  }

  return rounded;
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
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new Error(`${label} has an unsupported value.`);
  }

  return value as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(message);
}
