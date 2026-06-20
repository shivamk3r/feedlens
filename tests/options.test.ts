import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import { getSettings, getSetupStatus } from "../src/shared/storage";
import type { BackgroundMessage, ValidateApiKeyResponse } from "../src/shared/types";
import { getChromeMock } from "./helpers/chrome";

async function loadOptionsPage(
  validationResult?: ValidateApiKeyResponse | Error
): Promise<HTMLElement> {
  vi.resetModules();
  getChromeMock().runtime.sendMessage.mockImplementation(async (message: BackgroundMessage) => {
    if (message.type === "feedlens:getStatus") {
      return getSetupStatus();
    }

    if (message.type === "feedlens:validateApiKey") {
      if (validationResult instanceof Error) {
        throw validationResult;
      }

      return validationResult;
    }

    return undefined;
  });
  document.body.innerHTML = `<main id="feedlens-options-root" class="fl-shell"></main>`;
  await import("../src/options/index");
  await settle();
  return document.querySelector<HTMLElement>("#feedlens-options-root")!;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

describe("options page", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders only the customer-facing Gemini key and privacy setup controls", async () => {
    const root = await loadOptionsPage();
    const text = root.textContent ?? "";

    expect(text).toContain("Gemini API key");
    expect(text).toContain("Not configured");
    expect(text).toContain("Privacy notice");
    expect(text).toContain("Visible posts on supported platforms may be sent directly");

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

  it("validates the API key before saving the key and privacy choice", async () => {
    const chromeMock = getChromeMock();
    const root = await loadOptionsPage({
      ok: true,
      checkedAt: "2026-06-17T00:00:00.000Z"
    });

    const form = root.querySelector<HTMLFormElement>("#feedlens-settings-form")!;
    root.querySelector<HTMLInputElement>("#gemini-key")!.value = " test-key ";
    root.querySelector<HTMLInputElement>('input[name="privacyAccepted"]')!.checked = true;

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await settle();

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      type: "feedlens:validateApiKey",
      payload: { apiKey: "test-key" }
    });
    expect(getChromeMock().storage.local.data).toHaveProperty(
      "feedlens.geminiApiKey.local.v1",
      "test-key"
    );
    expect(getChromeMock().storage.local.data).toHaveProperty(
      "feedlens.geminiApiHealth.local.v1",
      {
        status: "valid",
        checkedAt: "2026-06-17T00:00:00.000Z",
        model: DEFAULT_SETTINGS.model
      }
    );
    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      privacyAccepted: true
    });
    expect(root.textContent).toContain("Ready");
  });

  it("does not show ready when a validated key is saved without privacy acceptance", async () => {
    const root = await loadOptionsPage({
      ok: true,
      checkedAt: "2026-06-17T00:00:00.000Z"
    });
    const form = root.querySelector<HTMLFormElement>("#feedlens-settings-form")!;
    root.querySelector<HTMLInputElement>("#gemini-key")!.value = " test-key ";
    root.querySelector<HTMLInputElement>('input[name="privacyAccepted"]')!.checked = false;

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await settle();

    expect(root.textContent).toContain("Privacy needed");
    expect(root.textContent).toContain("Accept the privacy notice before FeedLens analyzes visible posts.");
    expect(root.textContent).not.toContain("Gemini analysis check passed.");
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("does not save an API key when Gemini validation fails", async () => {
    const root = await loadOptionsPage({
      ok: false,
      error: {
        code: "provider_error",
        message: "Gemini could not use this API key.",
        retryable: false
      }
    });

    const form = root.querySelector<HTMLFormElement>("#feedlens-settings-form")!;
    root.querySelector<HTMLInputElement>("#gemini-key")!.value = " bad-key ";
    root.querySelector<HTMLInputElement>('input[name="privacyAccepted"]')!.checked = true;

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await settle();

    expect(getChromeMock().storage.local.data).not.toHaveProperty(
      "feedlens.geminiApiKey.local.v1"
    );
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    expect(root.textContent).toContain("Check failed");
    expect(root.textContent).toContain("Gemini key was not saved.");
  });

  it("does not save an API key when the validation request fails", async () => {
    const root = await loadOptionsPage(new Error("background unavailable"));
    const form = root.querySelector<HTMLFormElement>("#feedlens-settings-form")!;
    root.querySelector<HTMLInputElement>("#gemini-key")!.value = " candidate-key ";

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await settle();

    expect(getChromeMock().storage.local.data).not.toHaveProperty(
      "feedlens.geminiApiKey.local.v1"
    );
    expect(root.textContent).toContain("Check failed");
    expect(root.textContent).toContain("Gemini key check did not complete.");
  });
});
