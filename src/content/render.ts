import { hydrateIcons } from "../shared/icons";
import type { AnalysisResult, FeedLensSettings } from "../shared/types";

interface RenderMarkerOptions {
  host: HTMLElement;
  result: AnalysisResult;
  source: "cache" | "gemini";
  settings: FeedLensSettings;
}

let detailIdCounter = 0;

export function renderMarker({ host, result, source, settings }: RenderMarkerOptions): void {
  clearMarker(host);
  host.classList.add("feedlens-post");
  host.classList.add(`feedlens-post--${result.marker}`);
  host.classList.add(`feedlens-post--${settings.highlightIntensity}`);
  host.dataset.feedlensMarker = result.marker;

  if (settings.uiMode === "marker_only") {
    host.classList.add("feedlens-post--marker-only");
  }

  const marker = document.createElement("div");
  marker.className = `feedlens-marker feedlens-marker--${result.marker}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "feedlens-marker__button";
  button.setAttribute("aria-label", "Show FeedLens details");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "dialog");

  const icon = document.createElement("i");
  icon.dataset.lucide = "search";
  button.append(icon);

  const detailId = `feedlens-detail-${++detailIdCounter}`;
  button.setAttribute("aria-controls", detailId);

  const detail = createDetail(result, source);
  detail.id = detailId;
  detail.hidden = true;

  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !expanded;
    button.setAttribute("aria-expanded", String(nextExpanded));
    button.setAttribute(
      "aria-label",
      nextExpanded ? "Hide FeedLens details" : "Show FeedLens details"
    );
    detail.hidden = expanded;
  });

  marker.append(button, detail);
  host.prepend(marker);
  hydrateIcons(marker);
}

export function renderPending(host: HTMLElement): void {
  clearMarker(host);
  host.classList.add("feedlens-post", "feedlens-post--pending-state");
  const marker = document.createElement("div");
  marker.className = "feedlens-marker feedlens-marker--pending feedlens-marker--status";
  marker.textContent = "FeedLens analyzing";
  host.prepend(marker);
}

export function renderError(host: HTMLElement, message: string): void {
  clearMarker(host);
  host.classList.add("feedlens-post", "feedlens-post--error-state");
  const marker = document.createElement("div");
  marker.className = "feedlens-marker feedlens-marker--error feedlens-marker--status";
  marker.textContent = message;
  host.prepend(marker);
}

export function clearMarker(host: HTMLElement): void {
  host.querySelectorAll(":scope > .feedlens-marker").forEach((marker) => marker.remove());
  host.classList.remove(
    "feedlens-post",
    "feedlens-post--green",
    "feedlens-post--yellow",
    "feedlens-post--red",
    "feedlens-post--subtle",
    "feedlens-post--standard",
    "feedlens-post--strong",
    "feedlens-post--marker-only",
    "feedlens-post--pending-state",
    "feedlens-post--error-state"
  );
  delete host.dataset.feedlensMarker;
}

function createDetail(result: AnalysisResult, source: "cache" | "gemini"): HTMLElement {
  const detail = document.createElement("section");
  detail.className = "feedlens-detail";
  detail.setAttribute("role", "dialog");
  detail.setAttribute("aria-label", "FeedLens analysis details");

  const header = document.createElement("div");
  header.className = "feedlens-detail__header";

  const label = document.createElement("strong");
  label.className = `feedlens-detail__label feedlens-detail__label--${result.marker}`;
  label.textContent = labelForMarker(result.marker);

  const meta = document.createElement("span");
  meta.className = "feedlens-detail__meta";
  meta.textContent = `${result.confidence} confidence - ${source}`;

  header.append(label, meta);

  const scores = document.createElement("div");
  scores.className = "feedlens-detail__scores";
  scores.append(
    scorePill("Info", result.information_quality_score),
    scorePill("Misinformation", result.misinformation_risk_score),
    scorePill("Pressure", result.manipulation_pressure_score),
    scorePill("Overall risk", result.overall_risk_score)
  );

  const summary = document.createElement("p");
  summary.className = "feedlens-detail__summary";
  summary.textContent = result.summary;

  const signals = document.createElement("ul");
  signals.className = "feedlens-detail__signals";
  for (const signal of result.signals) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = `${formatSignal(signal.type)} (${signal.severity})`;

    const explanation = document.createElement("span");
    explanation.textContent = signal.explanation;

    item.append(title, ": ", explanation);
    if (signal.evidence) {
      const evidence = document.createElement("em");
      evidence.textContent = signal.evidence;
      item.append(document.createElement("br"), evidence);
    }
    signals.append(item);
  }

  const counter = document.createElement("p");
  counter.className = "feedlens-detail__counter";
  counter.textContent = `Counter-reading: ${result.counter_reading}`;

  const action = document.createElement("p");
  action.className = "feedlens-detail__action";
  action.textContent = `Suggested action: ${result.suggested_user_action}`;

  detail.append(header, scores, summary);
  if (result.signals.length) {
    detail.append(signals);
  }
  detail.append(counter, action);
  return detail;
}

function scorePill(label: string, score: number): HTMLElement {
  const pill = document.createElement("span");
  pill.className = "feedlens-detail__score";
  pill.textContent = `${label} ${score}`;
  return pill;
}

function labelForMarker(marker: AnalysisResult["marker"]): string {
  if (marker === "green") {
    return "High-quality";
  }
  if (marker === "yellow") {
    return "Mixed";
  }
  return "High risk";
}

function formatSignal(type: string): string {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
