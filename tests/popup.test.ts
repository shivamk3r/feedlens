import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import type { ContentState, SetupStatus } from "../src/shared/types";
import { getChromeMock } from "./helpers/chrome";

const setupStatus: SetupStatus = {
  settings: {
    ...DEFAULT_SETTINGS,
    privacyAccepted: true
  },
  hasApiKey: true,
  apiKeyHealth: {
    status: "valid",
    checkedAt: "2026-06-17T00:00:00.000Z",
    model: DEFAULT_SETTINGS.model
  },
  setup: {
    code: "ready",
    ready: true,
    label: "Ready",
    detail: "Gemini analysis check passed."
  },
  cacheEntryCount: 0
};

const privacyNeededStatus: SetupStatus = {
  settings: DEFAULT_SETTINGS,
  hasApiKey: true,
  apiKeyHealth: {
    status: "valid",
    checkedAt: "2026-06-17T00:00:00.000Z",
    model: DEFAULT_SETTINGS.model
  },
  setup: {
    code: "privacy_not_accepted",
    ready: false,
    label: "Privacy needed",
    detail: "Accept the privacy notice before FeedLens analyzes visible posts."
  },
  cacheEntryCount: 0
};

const contentState: ContentState = {
  detectedCount: 1,
  analyzedCount: 1,
  pendingCount: 0,
  errorCount: 0,
  paused: false,
  supported: true,
  platform: "linkedin",
  platformLabel: "LinkedIn"
};

async function loadPopup(status: SetupStatus = setupStatus): Promise<HTMLElement> {
  vi.resetModules();
  const chromeMock = getChromeMock();
  chromeMock.runtime.sendMessage.mockResolvedValue(status);
  chromeMock.tabs.sendMessage.mockResolvedValue(contentState);
  document.body.innerHTML = `<main id="feedlens-popup-root" class="fl-shell"></main>`;
  await import("../src/popup/index");
  await settle();
  return document.querySelector<HTMLElement>("#feedlens-popup-root")!;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

describe("popup debug entry", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows and opens debug logs in development/test builds", async () => {
    const root = await loadPopup();

    expect(root.querySelector("#feedlens-sidepanel")).toBeNull();
    expect(root.textContent).not.toContain("Details");
    expect(root.querySelector("#feedlens-analyze")).toBeTruthy();
    expect(root.querySelector("#feedlens-clear")).toBeTruthy();
    expect(root.querySelector("#feedlens-options")).toBeTruthy();

    const debugButton = root.querySelector<HTMLButtonElement>("#feedlens-debug");
    expect(debugButton).toBeTruthy();
    expect(root.textContent).toContain("Debug logs");

    debugButton?.click();
    expect(getChromeMock().runtime.getURL).toHaveBeenCalledWith("debug.html");
    expect(getChromeMock().tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://feedlens/debug.html"
    });
  });

  it("hides debug logs in production builds", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const root = await loadPopup();

    expect(root.querySelector("#feedlens-debug")).toBeNull();
    expect(root.textContent).not.toContain("Debug logs");
  });

  it("keeps analysis disabled when key health exists but privacy is not accepted", async () => {
    const root = await loadPopup(privacyNeededStatus);

    expect(root.textContent).toContain("Privacy needed");
    expect(root.textContent).toContain("Accept the privacy notice before FeedLens analyzes visible posts.");
    expect(root.querySelector<HTMLButtonElement>("#feedlens-analyze")?.disabled).toBe(true);
  });
});
