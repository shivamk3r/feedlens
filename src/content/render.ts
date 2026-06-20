import { hydrateIcons } from "../shared/icons";
import type { AnalysisResult, FeedLensSettings } from "../shared/types";

interface RenderMarkerOptions {
  host: HTMLElement;
  result: AnalysisResult;
  source: "cache" | "gemini";
  settings: FeedLensSettings;
}

let detailIdCounter = 0;
const DETAIL_EDGE_INSET_PX = 8;
const DETAIL_GAP_PX = 8;
const DETAIL_MAX_HEIGHT_PX = 520;
const DETAIL_MAX_WIDTH_PX = 380;
const DETAIL_MIN_BELOW_HEIGHT_PX = 120;
const DETAIL_VIEWPORT_INLINE_INSET_PX = 32;

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
    if (nextExpanded) {
      positionDetailWithinPost(host, marker, button, detail);
    }
    detail.hidden = !nextExpanded;
  });

  marker.append(button);
  host.prepend(marker, detail);
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
  host
    .querySelectorAll(":scope > .feedlens-marker, :scope > .feedlens-detail")
    .forEach((element) => element.remove());
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
  detail.className = `feedlens-detail feedlens-detail--${result.marker}`;
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

function positionDetailWithinPost(
  host: HTMLElement,
  marker: HTMLElement,
  button: HTMLElement,
  detail: HTMLElement
): void {
  const hostRect = host.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const hostWidth = rectWidth(hostRect);
  const hostHeight = rectHeight(hostRect);
  const markerHeight = rectHeight(markerRect);
  const buttonHeight = rectHeight(buttonRect);

  if (!hostWidth || !hostHeight || !markerHeight || !buttonHeight) {
    detail.dataset.feedlensPlacement = "below";
    return;
  }

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || hostWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || hostHeight;
  const viewportWidthLimit = Math.max(1, viewportWidth - DETAIL_VIEWPORT_INLINE_INSET_PX);
  const viewportHeightLimit = Math.max(1, Math.round(viewportHeight * 0.7));
  const maxVisualHeight = Math.min(DETAIL_MAX_HEIGHT_PX, viewportHeightLimit);
  const defaultWidth = boundedWidth(hostWidth - DETAIL_EDGE_INSET_PX * 2, viewportWidthLimit);
  const preferredRight = hostRect.right - buttonRect.right;

  const belowTop =
    Math.max(markerRect.bottom - hostRect.top, buttonRect.bottom - hostRect.top) + DETAIL_GAP_PX;
  const belowMaxHeight = Math.min(
    maxVisualHeight,
    hostHeight - belowTop - DETAIL_EDGE_INSET_PX
  );

  if (belowMaxHeight >= DETAIL_MIN_BELOW_HEIGHT_PX) {
    const right = clamp(
      preferredRight,
      DETAIL_EDGE_INSET_PX,
      Math.max(DETAIL_EDGE_INSET_PX, hostWidth - defaultWidth - DETAIL_EDGE_INSET_PX)
    );
    applyDetailPlacement(detail, "below", belowTop, right, defaultWidth, belowMaxHeight);
    return;
  }

  const markerTop = markerRect.top - hostRect.top;
  const compactTop = clamp(
    markerTop,
    DETAIL_EDGE_INSET_PX,
    Math.max(DETAIL_EDGE_INSET_PX, hostHeight - DETAIL_EDGE_INSET_PX)
  );
  const compactMaxHeight = Math.min(
    maxVisualHeight,
    Math.max(1, hostHeight - compactTop - DETAIL_EDGE_INSET_PX)
  );
  const buttonLeft = buttonRect.left - hostRect.left;
  const adjacentWidth = Math.max(1, buttonLeft - DETAIL_EDGE_INSET_PX - DETAIL_GAP_PX);
  const compactWidth = boundedWidth(adjacentWidth, viewportWidthLimit);
  const compactRightEdge = Math.max(DETAIL_EDGE_INSET_PX, buttonLeft - DETAIL_GAP_PX);
  const compactRight = Math.max(DETAIL_EDGE_INSET_PX, hostWidth - compactRightEdge);

  applyDetailPlacement(
    detail,
    "compact",
    compactTop,
    compactRight,
    compactWidth,
    compactMaxHeight
  );
}

function applyDetailPlacement(
  detail: HTMLElement,
  placement: "below" | "compact",
  top: number,
  right: number,
  width: number,
  maxHeight: number
): void {
  detail.dataset.feedlensPlacement = placement;
  detail.style.setProperty("--feedlens-detail-top", toPixels(top));
  detail.style.setProperty("--feedlens-detail-right", toPixels(right));
  detail.style.setProperty("--feedlens-detail-width", toPixels(width));
  detail.style.setProperty("--feedlens-detail-max-height", toPixels(maxHeight));
}

function boundedWidth(availableWidth: number, viewportWidthLimit: number): number {
  return Math.max(1, Math.min(DETAIL_MAX_WIDTH_PX, viewportWidthLimit, availableWidth));
}

function rectWidth(rect: DOMRect): number {
  return rect.width || Math.max(0, rect.right - rect.left);
}

function rectHeight(rect: DOMRect): number {
  return rect.height || Math.max(0, rect.bottom - rect.top);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function toPixels(value: number): string {
  return `${Math.max(0, Math.round(value))}px`;
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
