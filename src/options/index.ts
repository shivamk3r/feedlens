import { hydrateIcons } from "../shared/icons";
import {
  clearApiKey,
  getApiKeyHealth,
  getSettings,
  hasApiKey,
  saveApiKey,
  saveApiKeyHealth,
  saveSettings
} from "../shared/storage";
import type { ApiKeyHealth, ValidateApiKeyResponse } from "../shared/types";
import { escapeHtml, sendBackgroundMessage } from "../shared/ui";

const root = document.querySelector<HTMLElement>("#feedlens-options-root");

interface OptionsViewState {
  notice?: string;
  noticeTone?: "info" | "error";
  apiHealth?: ApiHealthState;
}

interface ApiHealthState {
  marker: "green" | "yellow" | "red";
  label: string;
  detail: string;
}

void render();

async function render(state: OptionsViewState = {}): Promise<void> {
  if (!root) {
    return;
  }

  const [settings, keyExists, savedHealth] = await Promise.all([
    getSettings(),
    hasApiKey(),
    getApiKeyHealth()
  ]);
  const apiHealth = state.apiHealth ?? apiHealthFromStorage(keyExists, savedHealth);

  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">FeedLens Settings</div>
        <div class="fl-brand__tagline">Gemini setup</div>
      </div>
    </header>
    <section class="fl-main fl-options-layout">
      <form class="fl-section" id="feedlens-settings-form">
        ${
          state.notice
            ? `<div class="${state.noticeTone === "error" ? "fl-error" : "fl-notice"}">${escapeHtml(state.notice)}</div>`
            : ""
        }
        <div class="fl-card">
          <h2>Gemini access</h2>
          <div class="fl-health" aria-live="polite">
            <span class="fl-badge fl-badge--${apiHealth.marker}">${escapeHtml(apiHealth.label)}</span>
            <span>${escapeHtml(apiHealth.detail)}</span>
          </div>
          <div class="fl-field">
            <label for="gemini-key">Gemini API key</label>
            <input class="fl-input" id="gemini-key" name="apiKey" type="password" autocomplete="off" placeholder="Paste your Gemini API key" />
            <div class="fl-help">Your key is stored in Chrome extension storage on this device and used only from your browser to call Gemini.</div>
          </div>
          <label class="fl-switch">
            <input type="checkbox" name="privacyAccepted" ${checked(settings.privacyAccepted)} />
            <span>Visible posts may be sent directly from this browser to Gemini using my API key.</span>
          </label>
          <div class="fl-actions">
            <button class="fl-button fl-button--primary" type="submit"><i data-lucide="save"></i>Save</button>
            <button class="fl-button fl-button--danger" type="button" id="clear-key"><i data-lucide="key-round"></i>Clear key</button>
          </div>
        </div>
      </form>

      <aside class="fl-section">
        <div class="fl-card">
          <h2>Privacy notice</h2>
          <p>FeedLens analyzes visible LinkedIn posts using Gemini with the API key you configure. FeedLens does not run a backend, does not store your LinkedIn feed on creator servers, and does not collect your API key.</p>
          <p>When analysis runs, visible post text may be sent directly from your browser to Gemini. Your Gemini use is subject to Google's privacy policy and billing terms.</p>
        </div>
      </aside>
    </section>
  `;

  hydrateIcons(root);
  bindOptions();
}

function bindOptions(): void {
  const form = root?.querySelector<HTMLFormElement>("#feedlens-settings-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const apiKey = String(formData.get("apiKey") ?? "").trim();
    const privacyAccepted = formData.get("privacyAccepted") === "on";

    if (apiKey) {
      await render({
        apiHealth: {
          marker: "yellow",
          label: "Checking",
          detail: "Testing Gemini analysis access."
        }
      });

      const validation = await validateApiKey(apiKey);
      if (!validation.ok) {
        await render({
          notice: "Gemini key was not saved.",
          noticeTone: "error",
          apiHealth: {
            marker: "red",
            label: "Check failed",
            detail: validation.error.message
          }
        });
        return;
      }

      await saveApiKey(apiKey);
      const currentSettings = await getSettings();
      await saveApiKeyHealth({
        status: "valid",
        checkedAt: validation.checkedAt,
        model: currentSettings.model
      });
      await saveSettings({ privacyAccepted });
      await render({
        notice: "Gemini key and privacy choice saved.",
        apiHealth: {
          marker: "green",
          label: "Ready",
          detail: "Gemini analysis check passed."
        }
      });
      return;
    }

    await saveSettings({ privacyAccepted });
    await render({ notice: "Privacy choice saved." });
  });

  root?.querySelector("#clear-key")?.addEventListener("click", async () => {
    await clearApiKey();
    await render({
      notice: "Gemini API key cleared from extension storage.",
      apiHealth: {
        marker: "yellow",
        label: "Not configured",
        detail: "No Gemini API key is saved."
      }
    });
  });
}

async function validateApiKey(apiKey: string): Promise<ValidateApiKeyResponse> {
  try {
    const response = await sendBackgroundMessage<ValidateApiKeyResponse>({
      type: "feedlens:validateApiKey",
      payload: { apiKey }
    });

    if (response?.ok === true || response?.ok === false) {
      return response;
    }
  } catch {
    // Fall through to the generic validation failure below.
  }

  return {
    ok: false,
    error: {
      code: "unknown",
      message: "Gemini key check did not complete. Try again in a moment.",
      retryable: true
    }
  };
}

function checked(value: boolean): string {
  return value ? "checked" : "";
}

function apiHealthFromStorage(
  keyExists: boolean,
  savedHealth: ApiKeyHealth | undefined
): ApiHealthState {
  if (!keyExists) {
    return {
      marker: "yellow",
      label: "Not configured",
      detail: "No Gemini API key is saved."
    };
  }

  if (savedHealth) {
    return {
      marker: "green",
      label: "Ready",
      detail: "Gemini analysis check passed."
    };
  }

  return {
    marker: "yellow",
    label: "Not checked",
    detail: "Save a Gemini API key to run a live check."
  };
}

export {};
