import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import { getChromeMock } from "./helpers/chrome";

const setupStatus = {
  settings: {
    ...DEFAULT_SETTINGS,
    privacyAccepted: true
  },
  hasApiKey: true,
  cacheEntryCount: 0,
  sessionResultCount: 0
};

const contentState = {
  detectedCount: 1,
  analyzedCount: 1,
  pendingCount: 0,
  errorCount: 0,
  paused: false,
  supported: true,
  platform: "linkedin",
  platformLabel: "LinkedIn"
};

async function loadPopup(): Promise<HTMLElement> {
  vi.resetModules();
  const chromeMock = getChromeMock();
  chromeMock.runtime.sendMessage.mockResolvedValue(setupStatus);
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
});
