import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import { getSettings } from "../src/shared/storage";
import { getChromeMock } from "./helpers/chrome";

async function loadOptionsPage(): Promise<HTMLElement> {
  vi.resetModules();
  document.body.innerHTML = `<main id="feedlens-options-root" class="fl-shell"></main>`;
  await import("../src/options/index");
  await settle();
  return document.querySelector<HTMLElement>("#feedlens-options-root")!;
}

async function settle(): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("options page", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders only the customer-facing Gemini key and privacy setup controls", async () => {
    const root = await loadOptionsPage();
    const text = root.textContent ?? "";

    expect(text).toContain("Gemini API key");
    expect(text).toContain("Privacy notice");
    expect(text).toContain("Visible posts may be sent directly from this browser to Gemini");

    expect(text).not.toContain("Current key status");
    expect(text).not.toContain(".env");
    expect(text).not.toContain("Key storage");
    expect(text).not.toContain("Gemini model");
    expect(text).not.toContain("Analysis behavior");
    expect(text).not.toContain("Analysis depth");
    expect(text).not.toContain("Sensitivity");
    expect(text).not.toContain("Temperature");
    expect(text).not.toContain("Max output tokens");
    expect(text).not.toContain("Display");
  });

  it("saves only the API key and privacy choice from the form", async () => {
    const root = await loadOptionsPage();
    const form = root.querySelector<HTMLFormElement>("#feedlens-settings-form")!;
    root.querySelector<HTMLInputElement>("#gemini-key")!.value = " test-key ";
    root.querySelector<HTMLInputElement>('input[name="privacyAccepted"]')!.checked = true;

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await settle();

    expect(getChromeMock().storage.local.data).toHaveProperty(
      "feedlens.geminiApiKey.local.v1",
      "test-key"
    );
    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      privacyAccepted: true
    });
  });
});
