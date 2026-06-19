import type { AppendDebugLogRequest, DebugLogEntry, DebugLogPayload } from "./types";

const DEBUG_LOGS_KEY = "feedlens.debugLogs.session.v1";
const MAX_DEBUG_LOGS = 200;
const RISKY_PAYLOAD_KEYS = new Set([
  "apikey",
  "text",
  "prompt",
  "request",
  "response",
  "body",
  "snippet",
  "summary",
  "evidence",
  "author",
  "url"
]);

export function isDebugLoggingEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

export async function appendDebugLog(request: AppendDebugLogRequest): Promise<void> {
  if (!isDebugLoggingEnabled()) {
    return;
  }

  const entry: DebugLogEntry = {
    id: makeDebugLogId(),
    createdAt: new Date().toISOString(),
    source: request.source,
    severity: request.severity ?? "info",
    event: request.event,
    payload: sanitizeDebugPayload(request.payload)
  };

  const logs = await getDebugLogs();
  await chrome.storage.session.set({
    [DEBUG_LOGS_KEY]: [entry, ...logs].slice(0, MAX_DEBUG_LOGS)
  });
}

export async function getDebugLogs(): Promise<DebugLogEntry[]> {
  if (!isDebugLoggingEnabled()) {
    return [];
  }

  const stored = await chrome.storage.session.get(DEBUG_LOGS_KEY);
  const value = stored[DEBUG_LOGS_KEY];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isDebugLogEntry).slice(0, MAX_DEBUG_LOGS);
}

export async function clearDebugLogs(): Promise<void> {
  if (!isDebugLoggingEnabled()) {
    return;
  }

  await chrome.storage.session.remove(DEBUG_LOGS_KEY);
}

export function sanitizeDebugPayload(payload: Record<string, unknown> | undefined): DebugLogPayload | undefined {
  if (!payload) {
    return undefined;
  }

  const sanitized: DebugLogPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isRiskyPayloadKey(key)) {
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, 240);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length ? sanitized : undefined;
}

function isDebugLogEntry(value: unknown): value is DebugLogEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.source === "string" &&
    typeof entry.severity === "string" &&
    typeof entry.event === "string" &&
    (entry.payload === undefined || isDebugPayload(entry.payload))
  );
}

function isDebugPayload(value: unknown): value is DebugLogPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean"
  );
}

function normalizePayloadKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isRiskyPayloadKey(key: string): boolean {
  const normalized = normalizePayloadKey(key);
  return Array.from(RISKY_PAYLOAD_KEYS).some((riskyKey) => normalized.includes(riskyKey));
}

function makeDebugLogId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}
