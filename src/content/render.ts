import type { AnalysisResult, FeedLensSettings } from "../shared/types";

interface RenderMarkerOptions {
  host: HTMLElement;
  result: AnalysisResult;
  source: "cache" | "gemini";
  settings: FeedLensSettings;
  onSelect: () => void;
}

export function renderMarker({ host, result, source, settings, onSelect }: RenderMarkerOptions): void {
  clearMarker(host);

  if (settings.uiMode === "side_panel_only") {
    return;
  }

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
  button.setAttribute("aria-expanded", "false");
  button.textContent = `FeedLens: ${labelForMarker(result.marker)}`;

  const meta = document.createElement("span");
  meta.className = "feedlens-marker__meta";
  meta.textContent = `${result.confidence} confidence - ${source}`;

  const detail = createDetail(result);
  detail.hidden = true;

  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    detail.hidden = expanded;
    onSelect();
  });

  marker.append(button, meta, detail);
  host.prepend(marker);
}

export function renderPending(host: HTMLElement): void {
  clearMarker(host);
  const marker = document.createElement("div");
  marker.className = "feedlens-marker feedlens-marker--pending";
  marker.innerHTML = `<span class="feedlens-marker__button feedlens-marker__button--static">FeedLens: Analyzing</span>`;
  host.prepend(marker);
}

export function renderError(host: HTMLElement, message: string): void {
  clearMarker(host);
  const marker = document.createElement("div");
  marker.className = "feedlens-marker feedlens-marker--error";
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
    "feedlens-post--marker-only"
  );
  delete host.dataset.feedlensMarker;
}

function createDetail(result: AnalysisResult): HTMLElement {
  const detail = document.createElement("section");
  detail.className = "feedlens-detail";

  const scores = document.createElement("div");
  scores.className = "feedlens-detail__scores";
  scores.append(
    scorePill("Info", result.information_quality_score),
    scorePill("Risk", result.misinformation_risk_score),
    scorePill("Pressure", result.manipulation_pressure_score)
  );

  const summary = document.createElement("p");
  summary.className = "feedlens-detail__summary";
  summary.textContent = result.summary;

  const signals = document.createElement("ul");
  signals.className = "feedlens-detail__signals";
  for (const signal of result.signals.slice(0, 4)) {
    const item = document.createElement("li");
    item.textContent = `${formatSignal(signal.type)} (${signal.severity}): ${signal.explanation}`;
    signals.append(item);
  }

  const counter = document.createElement("p");
  counter.className = "feedlens-detail__counter";
  counter.textContent = result.counter_reading;

  detail.append(scores, summary);
  if (result.signals.length) {
    detail.append(signals);
  }
  detail.append(counter);
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
