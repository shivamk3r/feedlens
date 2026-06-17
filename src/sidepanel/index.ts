import { hydrateIcons } from "../shared/icons";
import type { ContentState, SessionResult, SetupStatus } from "../shared/types";
import {
  analysisToText,
  escapeHtml,
  markerClass,
  markerLabel,
  sendActiveTabMessage,
  sendBackgroundMessage,
  signalLabel
} from "../shared/ui";

const root = document.querySelector<HTMLElement>("#feedlens-sidepanel-root");

void render();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && Object.keys(changes).some((key) => key.startsWith("feedlens."))) {
    void render();
  }
});

async function render(notice?: string): Promise<void> {
  if (!root) {
    return;
  }

  const [status, response] = await Promise.all([
    sendBackgroundMessage<SetupStatus>({ type: "feedlens:getStatus" }),
    sendBackgroundMessage<{ ok: true; results: SessionResult[] }>({ type: "feedlens:getSessionResults" })
  ]);

  const results = prioritizeSelected(response.results, status.selectedHash);

  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">FeedLens Details</div>
        <div class="fl-brand__tagline">${results.length ? `${results.length} session result${results.length === 1 ? "" : "s"}` : "No results yet"}</div>
      </div>
      <button class="fl-button" id="refresh-panel"><i data-lucide="refresh-ccw"></i>Refresh</button>
    </header>
    <section class="fl-main">
      ${notice ? `<div class="fl-notice">${escapeHtml(notice)}</div>` : ""}
      ${
        results.length
          ? results.map((result) => renderResult(result, status.selectedHash)).join("")
          : `<div class="fl-card"><h2>No analyzed posts</h2><p>Open LinkedIn and run FeedLens on visible feed posts.</p></div>`
      }
    </section>
  `;

  hydrateIcons(root);
  bindPanelActions(results);
}

function renderResult(result: SessionResult, selectedHash?: string): string {
  const analysis = result.result;
  const selected = result.hash === selectedHash;
  const signals = analysis.signals.slice(0, 6);

  return `
    <article class="fl-card fl-result ${selected ? "fl-result--selected" : ""}" data-hash="${escapeHtml(result.hash)}">
      <div class="fl-row">
        <span class="${markerClass(analysis.marker)}">${markerLabel(analysis.marker)}</span>
        <span class="fl-help">${analysis.confidence} confidence - ${result.source}</span>
      </div>
      <p class="fl-result__snippet">${escapeHtml(result.snippet)}</p>
      ${result.author ? `<div class="fl-help">Author: ${escapeHtml(result.author)}</div>` : ""}
      <div class="fl-score-grid">
        ${score("Info", analysis.information_quality_score)}
        ${score("Risk", analysis.misinformation_risk_score)}
        ${score("Pressure", analysis.manipulation_pressure_score)}
      </div>
      <p>${escapeHtml(analysis.summary)}</p>
      ${
        signals.length
          ? `<ul class="fl-signal-list">${signals
              .map(
                (signal) =>
                  `<li><strong>${signalLabel(signal.type)}</strong> (${signal.severity}): ${escapeHtml(signal.explanation)}${
                    signal.evidence ? `<br /><span>${escapeHtml(signal.evidence)}</span>` : ""
                  }</li>`
              )
              .join("")}</ul>`
          : ""
      }
      <div class="fl-result__detail">
        <h3>Counter-reading</h3>
        <p>${escapeHtml(analysis.counter_reading)}</p>
        <h3>Suggested action</h3>
        <p>${escapeHtml(analysis.suggested_user_action)}</p>
      </div>
      <div class="fl-actions">
        <button class="fl-button" data-action="copy"><i data-lucide="copy"></i>Copy</button>
        <button class="fl-button" data-action="reanalyze"><i data-lucide="refresh-ccw"></i>Re-analyze</button>
        <button class="fl-button" data-action="useful"><i data-lucide="thumbs-up"></i>Useful</button>
        <button class="fl-button" data-action="not_useful"><i data-lucide="thumbs-down"></i>Not useful</button>
        <button class="fl-button fl-button--danger" data-action="hide"><i data-lucide="eye-off"></i>Hide</button>
      </div>
    </article>
  `;
}

function bindPanelActions(results: SessionResult[]): void {
  root?.querySelector("#refresh-panel")?.addEventListener("click", () => {
    void render();
  });

  root?.querySelectorAll<HTMLElement>(".fl-result").forEach((card) => {
    const hash = card.dataset.hash;
    const result = results.find((candidate) => candidate.hash === hash);
    if (!hash || !result) {
      return;
    }

    card.querySelector('[data-action="copy"]')?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(analysisToText(result));
      await render("Analysis copied.");
    });

    card.querySelector('[data-action="reanalyze"]')?.addEventListener("click", async () => {
      await sendActiveTabMessage<ContentState>({
        type: "feedlens-content:reanalyzeHash",
        payload: { hash }
      });
      await render("Requested re-analysis for the visible post.");
    });

    card.querySelector('[data-action="useful"]')?.addEventListener("click", async () => {
      await sendBackgroundMessage({
        type: "feedlens:setFeedback",
        payload: { hash, feedback: "useful" }
      });
      await render("Marked useful locally for this browser session.");
    });

    card.querySelector('[data-action="not_useful"]')?.addEventListener("click", async () => {
      await sendBackgroundMessage({
        type: "feedlens:setFeedback",
        payload: { hash, feedback: "not_useful" }
      });
      await render("Marked not useful locally for this browser session.");
    });

    card.querySelector('[data-action="hide"]')?.addEventListener("click", async () => {
      await sendBackgroundMessage({ type: "feedlens:hideResult", payload: { hash } });
      await render("Result hidden from the side panel.");
    });
  });
}

function prioritizeSelected(results: SessionResult[], selectedHash?: string): SessionResult[] {
  if (!selectedHash) {
    return results;
  }

  return [...results].sort((a, b) => {
    if (a.hash === selectedHash) {
      return -1;
    }
    if (b.hash === selectedHash) {
      return 1;
    }
    return 0;
  });
}

function score(label: string, value: number): string {
  return `
    <div class="fl-score">
      <span>${label}</span>
      <strong>${value}</strong>
      <div class="fl-score__bar"><i style="width: ${value}%"></i></div>
    </div>
  `;
}

export {};
