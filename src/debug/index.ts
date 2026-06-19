import { isDebugLoggingEnabled } from "../shared/debug";
import { hydrateIcons } from "../shared/icons";
import type { DebugLogEntry } from "../shared/types";
import { escapeHtml, sendBackgroundMessage } from "../shared/ui";

const root = document.querySelector<HTMLElement>("#feedlens-debug-root");

void render();

async function render(notice?: string): Promise<void> {
  if (!root) {
    return;
  }

  if (!isDebugLoggingEnabled()) {
    root.innerHTML = `
      <header class="fl-topbar">
        <div class="fl-brand">
          <div class="fl-brand__name">FeedLens Debug Logs</div>
          <div class="fl-brand__tagline">Development build required</div>
        </div>
      </header>
      <section class="fl-main">
        <div class="fl-card"><h2>Unavailable</h2><p>Debug logs are available only in development builds.</p></div>
      </section>
    `;
    return;
  }

  const response = await sendBackgroundMessage<{ ok: true; logs: DebugLogEntry[] }>({
    type: "feedlens:getDebugLogs"
  });
  const logs = response.logs;

  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">FeedLens Debug Logs</div>
        <div class="fl-brand__tagline">${logs.length} session event${logs.length === 1 ? "" : "s"}</div>
      </div>
      <div class="fl-actions">
        <button class="fl-button" id="debug-refresh"><i data-lucide="refresh-ccw"></i>Refresh</button>
        <button class="fl-button" id="debug-copy" ${logs.length ? "" : "disabled"}><i data-lucide="copy"></i>Copy JSON</button>
        <button class="fl-button fl-button--danger" id="debug-clear" ${logs.length ? "" : "disabled"}><i data-lucide="trash-2"></i>Clear</button>
      </div>
    </header>
    <section class="fl-main">
      ${notice ? `<div class="fl-notice">${escapeHtml(notice)}</div>` : ""}
      ${
        logs.length
          ? logs.map(renderLogEntry).join("")
          : `<div class="fl-card"><h2>No debug logs yet</h2><p>Use a development build and run FeedLens on a supported platform to collect session logs.</p></div>`
      }
    </section>
  `;

  hydrateIcons(root);
  bindDebugActions(logs);
}

function renderLogEntry(log: DebugLogEntry): string {
  const payload = log.payload ? JSON.stringify(log.payload, null, 2) : "";

  return `
    <article class="fl-card fl-debug-log">
      <div class="fl-row">
        <div class="fl-debug-log__title">
          <span class="${severityClass(log.severity)}">${escapeHtml(log.severity)}</span>
          <strong>${escapeHtml(log.event)}</strong>
          <span class="fl-help">${escapeHtml(log.source)}</span>
        </div>
        <time class="fl-help" datetime="${escapeHtml(log.createdAt)}">${escapeHtml(formatDate(log.createdAt))}</time>
      </div>
      ${payload ? `<pre class="fl-debug-log__payload">${escapeHtml(payload)}</pre>` : ""}
    </article>
  `;
}

function bindDebugActions(logs: DebugLogEntry[]): void {
  root?.querySelector("#debug-refresh")?.addEventListener("click", () => {
    void render();
  });

  root?.querySelector("#debug-copy")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
    await render("Debug logs copied.");
  });

  root?.querySelector("#debug-clear")?.addEventListener("click", async () => {
    await sendBackgroundMessage({ type: "feedlens:clearDebugLogs" });
    await render("Debug logs cleared.");
  });
}

function severityClass(severity: DebugLogEntry["severity"]): string {
  if (severity === "error") {
    return "fl-badge fl-badge--red";
  }
  if (severity === "warn") {
    return "fl-badge fl-badge--yellow";
  }
  return "fl-badge fl-badge--green";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString();
}

export {};
