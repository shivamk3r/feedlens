import { describe, expect, it, vi } from "vitest";
import { renderMarker } from "../src/content/render";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import type { AnalysisResult, FeedLensSettings } from "../src/shared/types";

const result: AnalysisResult = {
  marker: "red",
  confidence: "medium",
  information_quality_score: 15,
  misinformation_risk_score: 41,
  manipulation_pressure_score: 44,
  overall_risk_score: 79,
  summary: "This post relies on urgency and unsupported broad claims.",
  signals: [
    {
      type: "artificial_urgency",
      severity: "high",
      evidence: "act now",
      explanation: "The phrase pushes immediate action without support."
    },
    {
      type: "missing_evidence",
      severity: "medium",
      evidence: "top performers",
      explanation: "The claim uses vague authority without specific evidence."
    }
  ],
  counter_reading: "It could be promotional shorthand rather than deliberate pressure.",
  suggested_user_action: "Read critically and look for evidence."
};

function settings(patch: Partial<FeedLensSettings> = {}): FeedLensSettings {
  return {
    ...DEFAULT_SETTINGS,
    privacyAccepted: true,
    ...patch
  };
}

interface MockRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function mockRect(element: HTMLElement, rect: MockRect): void {
  element.getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      toJSON: () => ({})
    }) as DOMRect;
}

describe("content marker rendering", () => {
  it("renders a post bezel with an accessible icon-only Lens details button", () => {
    const host = document.createElement("article");

    renderMarker({ host, result, source: "gemini", settings: settings() });

    expect(host.classList.contains("feedlens-post")).toBe(true);
    expect(host.classList.contains("feedlens-post--red")).toBe(true);
    expect(host.classList.contains("feedlens-post--standard")).toBe(true);
    expect(host.dataset.feedlensMarker).toBe("red");

    const marker = host.querySelector<HTMLElement>(":scope > .feedlens-marker");
    const button = marker?.querySelector<HTMLButtonElement>(".feedlens-marker__button");
    const detail = host.querySelector<HTMLElement>(":scope > .feedlens-detail");

    expect(marker).toBeTruthy();
    expect(button).toBeTruthy();
    expect(marker?.querySelector(".feedlens-detail")).toBeNull();
    expect(button?.textContent?.trim()).toBe("");
    expect(button?.getAttribute("aria-label")).toBe("Show FeedLens details");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.querySelector("svg")).toBeTruthy();
    expect(detail?.hidden).toBe(true);
    expect(detail?.textContent).toContain("High risk");
    expect(detail?.textContent).toContain("medium confidence - gemini");
    expect(detail?.textContent).toContain("Overall risk 79/100");
    expect(detail?.textContent).toContain("act now");
    expect(detail?.textContent).toContain("Suggested action");
  });

  it("renders normalized component scores as a signal mix separate from overall risk", () => {
    const host = document.createElement("article");

    renderMarker({ host, result, source: "gemini", settings: settings() });

    const scores = host.querySelector<HTMLElement>(".feedlens-detail__scores");
    const signalMix = scores?.querySelector<HTMLElement>(".feedlens-detail__score-mix");
    const overallRisk = scores?.querySelector<HTMLElement>(".feedlens-detail__overall-risk");

    expect(scores?.textContent).toContain("Signal mix");
    expect(signalMix?.textContent).toContain("Info quality 15%");
    expect(signalMix?.textContent).toContain("Misinformation 41%");
    expect(signalMix?.textContent).toContain("Pressure 44%");
    expect(overallRisk?.textContent).toBe("Overall risk 79/100");
  });

  it("replaces direct Lens details when rendering a new marker", () => {
    const host = document.createElement("article");

    renderMarker({ host, result, source: "gemini", settings: settings() });
    renderMarker({
      host,
      result: { ...result, marker: "green" },
      source: "cache",
      settings: settings()
    });

    expect(host.querySelectorAll(":scope > .feedlens-marker")).toHaveLength(1);
    expect(host.querySelectorAll(":scope > .feedlens-detail")).toHaveLength(1);
    expect(host.querySelector(".feedlens-detail--green")).toBeTruthy();
    expect(host.dataset.feedlensMarker).toBe("green");
  });

  it("toggles the inline Lens details without selecting a side panel result", () => {
    const host = document.createElement("article");
    const sendMessage = vi.spyOn(chrome.runtime, "sendMessage");

    renderMarker({ host, result, source: "cache", settings: settings() });

    const button = host.querySelector<HTMLButtonElement>(".feedlens-marker__button");
    const detail = host.querySelector<HTMLElement>(".feedlens-detail");
    expect(button).toBeTruthy();
    expect(detail).toBeTruthy();

    button?.click();
    expect(detail?.hidden).toBe(false);
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(button?.getAttribute("aria-label")).toBe("Hide FeedLens details");

    button?.click();
    expect(detail?.hidden).toBe(true);
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.getAttribute("aria-label")).toBe("Show FeedLens details");
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "feedlens:selectResult" })
    );
  });

  it("positions details below the Lens button when the post has enough height", () => {
    const host = document.createElement("article");

    renderMarker({ host, result, source: "gemini", settings: settings() });

    const marker = host.querySelector<HTMLElement>(":scope > .feedlens-marker");
    const button = host.querySelector<HTMLButtonElement>(".feedlens-marker__button");
    const detail = host.querySelector<HTMLElement>(":scope > .feedlens-detail");
    expect(marker).toBeTruthy();
    expect(button).toBeTruthy();
    expect(detail).toBeTruthy();

    mockRect(host, { left: 100, top: 200, width: 500, height: 720 });
    mockRect(marker!, { left: 560, top: 208, width: 32, height: 32 });
    mockRect(button!, { left: 560, top: 208, width: 32, height: 32 });

    button?.click();

    expect(detail?.dataset.feedlensPlacement).toBe("below");
    expect(detail?.style.getPropertyValue("--feedlens-detail-top")).toBe("48px");
    expect(detail?.style.getPropertyValue("--feedlens-detail-right")).toBe("8px");
    expect(detail?.style.getPropertyValue("--feedlens-detail-width")).toBe("380px");
    expect(detail?.style.getPropertyValue("--feedlens-detail-max-height")).toBe("520px");
  });

  it("keeps details inside a short post with compact bounded placement", () => {
    const host = document.createElement("article");

    renderMarker({ host, result, source: "gemini", settings: settings() });

    const marker = host.querySelector<HTMLElement>(":scope > .feedlens-marker");
    const button = host.querySelector<HTMLButtonElement>(".feedlens-marker__button");
    const detail = host.querySelector<HTMLElement>(":scope > .feedlens-detail");
    expect(marker).toBeTruthy();
    expect(button).toBeTruthy();
    expect(detail).toBeTruthy();

    mockRect(host, { left: 100, top: 200, width: 360, height: 72 });
    mockRect(marker!, { left: 420, top: 208, width: 32, height: 32 });
    mockRect(button!, { left: 420, top: 208, width: 32, height: 32 });

    button?.click();

    expect(detail?.hidden).toBe(false);
    expect(detail?.dataset.feedlensPlacement).toBe("compact");
    expect(detail?.style.getPropertyValue("--feedlens-detail-top")).toBe("8px");
    expect(detail?.style.getPropertyValue("--feedlens-detail-right")).toBe("48px");
    expect(detail?.style.getPropertyValue("--feedlens-detail-width")).toBe("304px");
    expect(detail?.style.getPropertyValue("--feedlens-detail-max-height")).toBe("56px");
  });

  it("preserves marker-only mode on the host for legacy UI handling", () => {
    const host = document.createElement("article");

    renderMarker({
      host,
      result,
      source: "gemini",
      settings: settings({ uiMode: "marker_only", highlightIntensity: "subtle" })
    });

    expect(host.classList.contains("feedlens-post--marker-only")).toBe(true);
    expect(host.classList.contains("feedlens-post--subtle")).toBe(true);
    expect(host.querySelector(".feedlens-marker__button")).toBeTruthy();
  });
});
