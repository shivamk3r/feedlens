import type { BackgroundMessage, ContentMessage, Marker, SessionResult } from "./types";

export function markerLabel(marker: Marker): string {
  if (marker === "green") {
    return "High-quality";
  }
  if (marker === "yellow") {
    return "Mixed / uncertain";
  }
  return "High risk";
}

export function markerClass(marker: Marker): string {
  return `fl-badge fl-badge--${marker}`;
}

export function signalLabel(type: string): string {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function analysisToText(result: SessionResult): string {
  const signals = result.result.signals
    .map((signal) => `- ${signalLabel(signal.type)} (${signal.severity}): ${signal.explanation}`)
    .join("\n");

  return [
    `FeedLens: ${markerLabel(result.result.marker)}`,
    `Confidence: ${result.result.confidence}`,
    `Information Quality: ${result.result.information_quality_score}`,
    `Misinformation Risk: ${result.result.misinformation_risk_score}`,
    `Manipulation Pressure: ${result.result.manipulation_pressure_score}`,
    "",
    result.result.summary,
    signals ? `\nSignals:\n${signals}` : "",
    `\nCounter-reading:\n${result.result.counter_reading}`,
    `\nSuggested action:\n${result.result.suggested_user_action}`
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendBackgroundMessage<T = unknown>(message: BackgroundMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

export async function sendActiveTabMessage<T = unknown>(message: ContentMessage): Promise<T | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return undefined;
  }

  return chrome.tabs.sendMessage(tab.id, message) as Promise<T>;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
