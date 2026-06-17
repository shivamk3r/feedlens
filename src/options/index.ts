import { hydrateIcons } from "../shared/icons";
import { clearApiKey, getSettings, saveApiKey, saveSettings } from "../shared/storage";
import { escapeHtml } from "../shared/ui";

const root = document.querySelector<HTMLElement>("#feedlens-options-root");

void render();

async function render(notice?: string): Promise<void> {
  if (!root) {
    return;
  }

  const settings = await getSettings();

  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">Feed Lens Settings</div>
        <div class="fl-brand__tagline">Gemini setup</div>
      </div>
    </header>
    <section class="fl-main fl-options-layout">
      <form class="fl-section" id="feedlens-settings-form">
        ${notice ? `<div class="fl-notice">${escapeHtml(notice)}</div>` : ""}
        <div class="fl-card">
          <h2>Gemini access</h2>
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
          <p>Feed Lens analyzes visible LinkedIn posts using Gemini with the API key you configure. Feed Lens does not run a backend, does not store your LinkedIn feed on creator servers, and does not collect your API key.</p>
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

    await saveSettings({ privacyAccepted: formData.get("privacyAccepted") === "on" });
    if (apiKey) {
      await saveApiKey(apiKey);
    }

    await render(apiKey ? "Gemini key and privacy choice saved." : "Privacy choice saved.");
  });

  root?.querySelector("#clear-key")?.addEventListener("click", async () => {
    await clearApiKey();
    await render("Gemini API key cleared from extension storage.");
  });
}

function checked(value: boolean): string {
  return value ? "checked" : "";
}

export {};
