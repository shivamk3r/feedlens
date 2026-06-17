import { GEMINI_MODEL_OPTIONS } from "../shared/defaults";
import { hydrateIcons } from "../shared/icons";
import {
  clearApiKey,
  getSettings,
  hasApiKey,
  saveApiKey,
  saveSettings
} from "../shared/storage";
import type {
  AnalysisDepth,
  FeedLensSettings,
  HighlightIntensity,
  Sensitivity,
  StorageMode,
  UiMode
} from "../shared/types";
import { escapeHtml, sendBackgroundMessage } from "../shared/ui";

const root = document.querySelector<HTMLElement>("#feedlens-options-root");

void render();

async function render(notice?: string): Promise<void> {
  if (!root) {
    return;
  }

  const settings = await getSettings();
  const keyExists = await hasApiKey(settings);

  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">Feed Lens Settings</div>
        <div class="fl-brand__tagline">Gemini-only local configuration</div>
      </div>
      <span class="${keyExists && settings.privacyAccepted ? "fl-badge fl-badge--green" : "fl-badge fl-badge--yellow"}">
        ${keyExists && settings.privacyAccepted ? "Ready" : "Setup needed"}
      </span>
    </header>
    <section class="fl-main fl-options-layout">
      <form class="fl-section" id="feedlens-settings-form">
        ${notice ? `<div class="fl-notice">${escapeHtml(notice)}</div>` : ""}
        <div class="fl-card">
          <h2>Gemini access</h2>
          <div class="fl-field">
            <label for="gemini-key">Gemini API key</label>
            <input class="fl-input" id="gemini-key" name="apiKey" type="password" autocomplete="off" placeholder="${keyExists ? "Key saved" : "Paste your Gemini API key"}" />
            <div class="fl-help">The key is stored only in Chrome extension storage. Session mode clears when the browser closes.</div>
          </div>
          <div class="fl-grid-2">
            <div class="fl-field">
              <label for="storage-mode">Key storage</label>
              <select class="fl-select" id="storage-mode" name="storageMode">
                <option value="session" ${selected(settings.storageMode, "session")}>Session only</option>
                <option value="local" ${selected(settings.storageMode, "local")}>Local persistent</option>
              </select>
            </div>
            <div class="fl-field">
              <label for="model">Gemini model</label>
              <input class="fl-input" id="model" name="model" list="gemini-model-options" value="${escapeHtml(settings.model)}" />
              <datalist id="gemini-model-options">
                ${GEMINI_MODEL_OPTIONS.map((model) => `<option value="${model}"></option>`).join("")}
              </datalist>
            </div>
          </div>
          ${
            settings.storageMode === "local"
              ? `<div class="fl-warning">Persistent key storage is more convenient but less private than session-only storage.</div>`
              : ""
          }
          <label class="fl-switch">
            <input type="checkbox" name="privacyAccepted" ${checked(settings.privacyAccepted)} />
            <span>Visible posts may be sent directly from this browser to Gemini using my API key.</span>
          </label>
          <div class="fl-actions">
            <button class="fl-button fl-button--primary" type="submit"><i data-lucide="save"></i>Save</button>
            <button class="fl-button fl-button--danger" type="button" id="clear-key"><i data-lucide="key-round"></i>Clear key</button>
          </div>
        </div>

        <div class="fl-card">
          <h2>Analysis behavior</h2>
          <div class="fl-grid-2">
            <label class="fl-switch">
              <input type="checkbox" name="enabled" ${checked(settings.enabled)} />
              <span>Feed Lens enabled</span>
            </label>
            <label class="fl-switch">
              <input type="checkbox" name="backgroundAnalysis" ${checked(settings.backgroundAnalysis)} />
              <span>Analyze visible posts in the background</span>
            </label>
            <label class="fl-switch">
              <input type="checkbox" name="storeCache" ${checked(settings.storeCache)} />
              <span>Use local analysis cache</span>
            </label>
            <div class="fl-field">
              <label for="max-posts">Max visible posts per run</label>
              <input class="fl-input" id="max-posts" name="maxVisiblePostsPerRun" type="number" min="1" max="20" step="1" value="${settings.maxVisiblePostsPerRun}" />
            </div>
          </div>
          <div class="fl-grid-2">
            <div class="fl-field">
              <label for="analysis-depth">Analysis depth</label>
              <select class="fl-select" id="analysis-depth" name="analysisDepth">
                ${option("fast", "Fast", settings.analysisDepth)}
                ${option("balanced", "Balanced", settings.analysisDepth)}
                ${option("deep", "Deep", settings.analysisDepth)}
              </select>
            </div>
            <div class="fl-field">
              <label for="sensitivity">Sensitivity</label>
              <select class="fl-select" id="sensitivity" name="sensitivity">
                ${option("conservative", "Conservative", settings.sensitivity)}
                ${option("balanced", "Balanced", settings.sensitivity)}
                ${option("strict", "Strict", settings.sensitivity)}
              </select>
            </div>
            <div class="fl-field">
              <label for="temperature">Temperature</label>
              <input class="fl-input" id="temperature" name="temperature" type="number" min="0" max="2" step="0.1" value="${settings.temperature}" />
            </div>
            <div class="fl-field">
              <label for="max-output">Max output tokens</label>
              <input class="fl-input" id="max-output" name="maxOutputTokens" type="number" min="512" max="4096" step="64" value="${settings.maxOutputTokens}" />
            </div>
          </div>
        </div>

        <div class="fl-card">
          <h2>Display</h2>
          <div class="fl-grid-2">
            <div class="fl-field">
              <label for="highlight-intensity">Highlight intensity</label>
              <select class="fl-select" id="highlight-intensity" name="highlightIntensity">
                ${option("subtle", "Subtle", settings.highlightIntensity)}
                ${option("standard", "Standard", settings.highlightIntensity)}
                ${option("strong", "Strong", settings.highlightIntensity)}
              </select>
            </div>
            <div class="fl-field">
              <label for="ui-mode">UI mode</label>
              <select class="fl-select" id="ui-mode" name="uiMode">
                ${option("both", "Feed markers and side panel", settings.uiMode)}
                ${option("feed_highlights", "Feed highlights", settings.uiMode)}
                ${option("marker_only", "Marker only", settings.uiMode)}
                ${option("side_panel_only", "Side panel only", settings.uiMode)}
              </select>
            </div>
          </div>
          <div class="fl-actions">
            <button class="fl-button fl-button--danger" type="button" id="clear-cache"><i data-lucide="trash-2"></i>Clear cache</button>
          </div>
        </div>
      </form>

      <aside class="fl-section">
        <div class="fl-card">
          <h2>Privacy notice</h2>
          <p>Feed Lens analyzes visible LinkedIn posts using Gemini with the API key you configure. Feed Lens does not run a backend, does not store your LinkedIn feed on creator servers, and does not collect your API key.</p>
          <p>When analysis runs, visible post text may be sent directly from your browser to Gemini. Your Gemini use is subject to Google's privacy policy and billing terms.</p>
        </div>
        <div class="fl-card">
          <h2>Current key status</h2>
          <p>${keyExists ? `A key is saved in ${settings.storageMode} storage.` : "No Gemini API key is saved."}</p>
          <p>Local .env files are for developer tooling only and are never bundled into the extension build.</p>
        </div>
      </aside>
    </section>
  `;

  hydrateIcons(root);
  bindOptions(settings);
}

function bindOptions(settings: FeedLensSettings): void {
  const form = root?.querySelector<HTMLFormElement>("#feedlens-settings-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const nextSettings = settingsFromForm(formData);
    const apiKey = String(formData.get("apiKey") ?? "").trim();

    await saveSettings(nextSettings);
    if (apiKey) {
      await saveApiKey(apiKey, nextSettings.storageMode);
    }

    await render(apiKey ? "Settings and Gemini key saved." : "Settings saved.");
  });

  root?.querySelector("#clear-key")?.addEventListener("click", async () => {
    await clearApiKey();
    await render("Gemini API key cleared from extension storage.");
  });

  root?.querySelector("#clear-cache")?.addEventListener("click", async () => {
    await sendBackgroundMessage({ type: "feedlens:clearCache" });
    await render("Local analysis cache cleared.");
  });

}

function settingsFromForm(formData: FormData): FeedLensSettings {
  return {
    enabled: formData.get("enabled") === "on",
    backgroundAnalysis: formData.get("backgroundAnalysis") === "on",
    privacyAccepted: formData.get("privacyAccepted") === "on",
    storageMode: formData.get("storageMode") as StorageMode,
    model: String(formData.get("model") ?? "").trim(),
    temperature: Number(formData.get("temperature")),
    maxOutputTokens: Number(formData.get("maxOutputTokens")),
    analysisDepth: formData.get("analysisDepth") as AnalysisDepth,
    storeCache: formData.get("storeCache") === "on",
    highlightIntensity: formData.get("highlightIntensity") as HighlightIntensity,
    sensitivity: formData.get("sensitivity") as Sensitivity,
    uiMode: formData.get("uiMode") as UiMode,
    maxVisiblePostsPerRun: Number(formData.get("maxVisiblePostsPerRun"))
  };
}

function checked(value: boolean): string {
  return value ? "checked" : "";
}

function selected(actual: string, expected: string): string {
  return actual === expected ? "selected" : "";
}

function option(value: string, label: string, actual: string): string {
  return `<option value="${value}" ${selected(actual, value)}>${label}</option>`;
}

export {};
