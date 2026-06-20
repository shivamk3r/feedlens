import { saveSettings } from "../shared/storage";
import { isDebugLoggingEnabled } from "../shared/debug";
import { hydrateIcons } from "../shared/icons";
import type { ContentState, SetupStatus } from "../shared/types";
import { escapeHtml, sendActiveTabMessage, sendBackgroundMessage } from "../shared/ui";

const root = document.querySelector<HTMLElement>("#feedlens-popup-root");

interface PopupState {
  status?: SetupStatus;
  page?: ContentState;
  notice?: string;
}

void render();

async function render(state: PopupState = {}): Promise<void> {
  if (!root) {
    return;
  }

  const [status, page] = await Promise.all([
    state.status ?? sendBackgroundMessage<SetupStatus>({ type: "feedlens:getStatus" }),
    state.page ?? sendActiveTabMessage<ContentState>({ type: "feedlens-content:getState" }).catch(() => undefined)
  ]);

  const configured = status.setup.ready;
  const paused = !status.settings.enabled || page?.paused;
  const supportedPlatformOpen = Boolean(page?.supported);
  const platformName = page?.platformLabel ?? "supported platform";
  const tagline = configured
    ? page?.platformLabel
      ? `Ready on ${escapeHtml(page.platformLabel)}`
      : status.setup.label
    : status.setup.label;

  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">FeedLens</div>
        <div class="fl-brand__tagline">${tagline}</div>
      </div>
      <span class="${configured ? "fl-badge fl-badge--green" : "fl-badge fl-badge--yellow"}">
        ${escapeHtml(status.setup.label)}
      </span>
    </header>
    <section class="fl-main">
      ${state.notice ? `<div class="fl-notice">${escapeHtml(state.notice)}</div>` : ""}
      ${
        configured
          ? ""
          : `<div class="fl-warning">${escapeHtml(status.setup.detail)}</div>`
      }
      ${
        supportedPlatformOpen
          ? renderPageState(page)
          : renderUnsupportedPageState(page)
      }
      <div class="fl-card">
        <h2>Controls</h2>
        <div class="fl-actions">
          <button class="fl-button" id="feedlens-toggle" ${!supportedPlatformOpen ? "disabled" : ""}>
            <i data-lucide="${paused ? "play" : "pause"}"></i>${paused ? "Resume" : "Pause"}
          </button>
          <button class="fl-button fl-button--primary" id="feedlens-analyze" ${!supportedPlatformOpen || !configured ? "disabled" : ""}>
            <i data-lucide="refresh-ccw"></i>Analyze visible
          </button>
          <button class="fl-button" id="feedlens-clear" ${!supportedPlatformOpen ? "disabled" : ""}>
            <i data-lucide="trash-2"></i>Clear markers
          </button>
          <button class="fl-button" id="feedlens-options">
            <i data-lucide="settings"></i>Settings
          </button>
          ${
            isDebugLoggingEnabled()
              ? `<button class="fl-button" id="feedlens-debug">
                  <i data-lucide="bug"></i>Debug logs
                </button>`
              : ""
          }
        </div>
      </div>
      <div class="fl-card">
        <h2>Local state</h2>
        <div class="fl-stats">
          <span>Cache: ${status.cacheEntryCount}</span>
          <span>Inline details: Lens button</span>
        </div>
      </div>
    </section>
  `;

  hydrateIcons(root);
  bindActions(status, page);
}

function renderPageState(page?: ContentState): string {
  return `
    <div class="fl-card">
      <h2>${escapeHtml(page?.platformLabel ?? "Visible")} feed</h2>
      <div class="fl-stats">
        <span>Detected: ${page?.detectedCount ?? 0}</span>
        <span>Analyzed: ${page?.analyzedCount ?? 0}</span>
        <span>Pending: ${page?.pendingCount ?? 0}</span>
        <span>Errors: ${page?.errorCount ?? 0}</span>
      </div>
      ${page?.lastError ? `<div class="fl-error">${escapeHtml(page.lastError)}</div>` : ""}
    </div>
  `;
}

function renderUnsupportedPageState(page?: ContentState): string {
  if (page?.platformLabel) {
    return `<div class="fl-card"><h2>${escapeHtml(page.platformLabel)} page not supported</h2><p>Open a supported ${escapeHtml(page.platformLabel)} feed or profile timeline, then use FeedLens from that tab.</p></div>`;
  }

  return `<div class="fl-card"><h2>Supported platform tab not detected</h2><p>Open LinkedIn or an X home/profile timeline, then use FeedLens from that tab.</p></div>`;
}

function bindActions(status: SetupStatus, page?: ContentState): void {
  root?.querySelector("#feedlens-options")?.addEventListener("click", () => {
    void chrome.runtime.openOptionsPage();
  });

  root?.querySelector("#feedlens-debug")?.addEventListener("click", () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL("debug.html") });
  });

  root?.querySelector("#feedlens-toggle")?.addEventListener("click", async () => {
    const nextEnabled = !(!status.settings.enabled || page?.paused);
    await saveSettings({ enabled: !nextEnabled });
    const updatedPage = await sendActiveTabMessage<ContentState>({
      type: "feedlens-content:setPaused",
      payload: { paused: nextEnabled }
    }).catch(() => page);
    await render({
      page: updatedPage,
      notice: nextEnabled ? "FeedLens is paused for this tab." : "FeedLens resumed."
    });
  });

  root?.querySelector("#feedlens-analyze")?.addEventListener("click", async () => {
    const updatedPage = await sendActiveTabMessage<ContentState>({
      type: "feedlens-content:reanalyzeVisible"
    }).catch(() => page);
    await render({ page: updatedPage, notice: "Requested analysis for visible posts." });
  });

  root?.querySelector("#feedlens-clear")?.addEventListener("click", async () => {
    const updatedPage = await sendActiveTabMessage<ContentState>({
      type: "feedlens-content:clearVisibleResults"
    }).catch(() => page);
    await render({ page: updatedPage, notice: "Visible FeedLens markers were cleared." });
  });
}

export {};
