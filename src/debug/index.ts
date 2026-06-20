import { isDebugLoggingEnabled } from "../shared/debug";
import { hydrateIcons } from "../shared/icons";
import type { DebugLogEntry } from "../shared/types";
import { escapeHtml, sendBackgroundMessage } from "../shared/ui";

const root = document.querySelector<HTMLElement>("#feedlens-debug-root");

type SeverityFilter = "all" | "warn_error" | "error" | "warn" | "info_debug";
type SourceFilter = "all" | DebugLogEntry["source"];
type OutcomeFilter = "all" | "success" | "failure" | "in_progress" | "skipped_blocked" | "cache";
type PlatformFilter = "all" | "linkedin" | "x" | "unknown";
type DerivedOutcome = Exclude<OutcomeFilter, "all"> | "other";

interface DebugFilters {
  severity: SeverityFilter;
  source: SourceFilter;
  outcome: OutcomeFilter;
  platform: PlatformFilter;
  query: string;
  startMs?: number;
  endMs?: number;
}

interface TimeRange {
  min: number;
  max: number;
  start: number;
  end: number;
  enabled: boolean;
}

interface DebugStats {
  visibleCount: number;
  postSuccessCount: number;
  postFailureCount: number;
  successRate: string;
  failureRate: string;
  averagePostDuration: string;
  averageGeminiLatency: string;
  p95GeminiLatency: string;
}

const DEFAULT_FILTERS: DebugFilters = {
  severity: "all",
  source: "all",
  outcome: "all",
  platform: "all",
  query: ""
};

let filters: DebugFilters = { ...DEFAULT_FILTERS };
let currentLogs: DebugLogEntry[] = [];

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
  currentLogs = response.logs;
  renderCurrent(notice);
}

function renderCurrent(notice?: string): void {
  if (!root) {
    return;
  }

  const timeRange = getTimeRange(currentLogs);
  const visibleLogs = applyFilters(currentLogs, timeRange);
  const stats = getStats(visibleLogs);

  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">FeedLens Debug Logs</div>
        <div class="fl-brand__tagline">${currentLogs.length} session event${currentLogs.length === 1 ? "" : "s"}</div>
      </div>
      <div class="fl-actions">
        <button class="fl-button" id="debug-refresh"><i data-lucide="refresh-ccw"></i>Refresh</button>
        <button class="fl-button" id="debug-copy" ${currentLogs.length ? "" : "disabled"}><i data-lucide="copy"></i>Copy filtered JSON</button>
        <button class="fl-button fl-button--danger" id="debug-clear" ${currentLogs.length ? "" : "disabled"}><i data-lucide="trash-2"></i>Clear</button>
      </div>
    </header>
    <section class="fl-main">
      ${notice ? `<div class="fl-notice">${escapeHtml(notice)}</div>` : ""}
      ${renderStats(stats)}
      ${renderFilters(timeRange)}
      ${renderLogs(visibleLogs)}
    </section>
  `;

  hydrateIcons(root);
  bindDebugActions(visibleLogs, timeRange);
}

function renderStats(stats: DebugStats): string {
  return `
    <section class="fl-debug-stats" aria-label="Debug log stats">
      ${renderStatTile("Visible logs", String(stats.visibleCount), "current filters")}
      ${renderStatTile("Post successes", String(stats.postSuccessCount), "marker rendered")}
      ${renderStatTile("Post failures", String(stats.postFailureCount), "analysis error")}
      ${renderStatTile("Success rate", stats.successRate, "post workflow")}
      ${renderStatTile("Failure rate", stats.failureRate, "post workflow")}
      ${renderStatTile("Avg post duration", stats.averagePostDuration, "content to result")}
      ${renderStatTile("Avg Gemini latency", stats.averageGeminiLatency, "post LLM calls")}
      ${renderStatTile("p95 Gemini latency", stats.p95GeminiLatency, "post LLM calls")}
    </section>
  `;
}

function renderStatTile(label: string, value: string, detail: string): string {
  return `
    <div class="fl-debug-stat">
      <span class="fl-debug-stat__label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span class="fl-help">${escapeHtml(detail)}</span>
    </div>
  `;
}

function renderFilters(timeRange: TimeRange): string {
  const disabled = currentLogs.length ? "" : "disabled";
  const rangeStep = getRangeStep(timeRange);

  return `
    <section class="fl-card fl-debug-filters" aria-label="Debug log filters">
      <div class="fl-row">
        <h2>Filters</h2>
        <button class="fl-button" id="debug-reset-filters" ${disabled}>Reset filters</button>
      </div>
      <div class="fl-debug-filter-grid">
        ${renderSelect("debug-filter-severity", "Severity", filters.severity, [
          ["all", "All severities"],
          ["warn_error", "Warnings + errors"],
          ["error", "Errors"],
          ["warn", "Warnings"],
          ["info_debug", "Info + debug"]
        ], disabled)}
        ${renderSelect("debug-filter-source", "Source", filters.source, [
          ["all", "All sources"],
          ["content", "Content"],
          ["background", "Background"],
          ["gemini", "Gemini"],
          ["popup", "Popup"],
          ["debug", "Debug"]
        ], disabled)}
        ${renderSelect("debug-filter-outcome", "Outcome", filters.outcome, [
          ["all", "All outcomes"],
          ["success", "Success"],
          ["failure", "Failure"],
          ["in_progress", "In progress"],
          ["skipped_blocked", "Skipped / blocked"],
          ["cache", "Cache"]
        ], disabled)}
        ${renderSelect("debug-filter-platform", "Platform", filters.platform, [
          ["all", "All platforms"],
          ["linkedin", "LinkedIn"],
          ["x", "X"],
          ["unknown", "Unknown"]
        ], disabled)}
        <div class="fl-field fl-debug-filter-search">
          <label for="debug-filter-query">Search</label>
          <input class="fl-input" id="debug-filter-query" type="search" value="${escapeHtml(filters.query)}" placeholder="Event, source, severity, safe payload" ${disabled} />
        </div>
      </div>
      <div class="fl-debug-time-range">
        <div class="fl-row">
          <span class="fl-label">Time range</span>
          <span class="fl-help">${escapeHtml(formatRangeLabel(timeRange))}</span>
        </div>
        <div class="fl-debug-range-inputs">
          <input id="debug-time-start" type="range" min="${timeRange.min}" max="${timeRange.max}" step="${rangeStep}" value="${timeRange.start}" ${timeRange.enabled ? "" : "disabled"} />
          <input id="debug-time-end" type="range" min="${timeRange.min}" max="${timeRange.max}" step="${rangeStep}" value="${timeRange.end}" ${timeRange.enabled ? "" : "disabled"} />
        </div>
      </div>
    </section>
  `;
}

function renderSelect(
  id: string,
  label: string,
  value: string,
  options: Array<[string, string]>,
  disabled: string
): string {
  return `
    <div class="fl-field">
      <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <select class="fl-select" id="${escapeHtml(id)}" ${disabled}>
        ${options
          .map(
            ([optionValue, optionLabel]) =>
              `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`
          )
          .join("")}
      </select>
    </div>
  `;
}

function renderLogs(logs: DebugLogEntry[]): string {
  if (!currentLogs.length) {
    return `<div class="fl-card"><h2>No debug logs yet</h2><p>Use a development build and run FeedLens on a supported platform to collect session logs.</p></div>`;
  }

  if (!logs.length) {
    return `<div class="fl-card"><h2>No matching logs</h2><p>Adjust or reset the filters to see more session events.</p></div>`;
  }

  return `
    <section class="fl-section">
      <div class="fl-row">
        <h2>Logs</h2>
        <span class="fl-help">${logs.length} of ${currentLogs.length}</span>
      </div>
      ${logs.map(renderLogEntry).join("")}
    </section>
  `;
}

function renderLogEntry(log: DebugLogEntry): string {
  const payload = log.payload ? JSON.stringify(log.payload, null, 2) : "";
  const durationMs = getPayloadNumber(log, "durationMs");
  const chips = [
    log.source,
    platformLabel(getPlatform(log)),
    outcomeLabel(getOutcome(log)),
    durationMs === undefined ? undefined : formatMs(durationMs)
  ]
    .filter((chip): chip is string => Boolean(chip))
    .map((chip) => `<span class="fl-debug-chip">${escapeHtml(chip)}</span>`)
    .join("");

  return `
    <article class="fl-card fl-debug-log">
      <div class="fl-row">
        <div class="fl-debug-log__title">
          <span class="${severityClass(log.severity)}">${escapeHtml(log.severity)}</span>
          <strong>${escapeHtml(log.event)}</strong>
          ${chips}
        </div>
        <time class="fl-help" datetime="${escapeHtml(log.createdAt)}">${escapeHtml(formatDate(log.createdAt))}</time>
      </div>
      ${payload ? `<pre class="fl-debug-log__payload">${escapeHtml(payload)}</pre>` : ""}
    </article>
  `;
}

function bindDebugActions(visibleLogs: DebugLogEntry[], timeRange: TimeRange): void {
  root?.querySelector("#debug-refresh")?.addEventListener("click", () => {
    void render();
  });

  root?.querySelector("#debug-copy")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(JSON.stringify(visibleLogs, null, 2));
    renderCurrent("Filtered debug logs copied.");
  });

  root?.querySelector("#debug-clear")?.addEventListener("click", async () => {
    await sendBackgroundMessage({ type: "feedlens:clearDebugLogs" });
    filters = { ...DEFAULT_FILTERS };
    await render("Debug logs cleared.");
  });

  root?.querySelector("#debug-reset-filters")?.addEventListener("click", () => {
    filters = { ...DEFAULT_FILTERS };
    renderCurrent();
  });

  bindSelectFilter("debug-filter-severity", (value) => {
    filters.severity = value as SeverityFilter;
  });
  bindSelectFilter("debug-filter-source", (value) => {
    filters.source = value as SourceFilter;
  });
  bindSelectFilter("debug-filter-outcome", (value) => {
    filters.outcome = value as OutcomeFilter;
  });
  bindSelectFilter("debug-filter-platform", (value) => {
    filters.platform = value as PlatformFilter;
  });

  root?.querySelector<HTMLInputElement>("#debug-filter-query")?.addEventListener("input", (event) => {
    filters.query = inputValue(event);
    renderCurrent();
  });

  root?.querySelector<HTMLInputElement>("#debug-time-start")?.addEventListener("input", (event) => {
    filters.startMs = Number(inputValue(event));
    const endMs = filters.endMs ?? timeRange.end;
    if (filters.startMs > endMs) {
      filters.endMs = filters.startMs;
    }
    renderCurrent();
  });

  root?.querySelector<HTMLInputElement>("#debug-time-end")?.addEventListener("input", (event) => {
    filters.endMs = Number(inputValue(event));
    const startMs = filters.startMs ?? timeRange.start;
    if (filters.endMs < startMs) {
      filters.startMs = filters.endMs;
    }
    renderCurrent();
  });
}

function bindSelectFilter(id: string, update: (value: string) => void): void {
  root?.querySelector<HTMLSelectElement>(`#${id}`)?.addEventListener("change", (event) => {
    update(inputValue(event));
    renderCurrent();
  });
}

function inputValue(event: Event): string {
  const target = event.currentTarget;
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement ? target.value : "";
}

function applyFilters(logs: DebugLogEntry[], timeRange: TimeRange): DebugLogEntry[] {
  const query = filters.query.trim().toLowerCase();

  return logs.filter((log) => {
    if (!matchesSeverity(log)) {
      return false;
    }
    if (filters.source !== "all" && log.source !== filters.source) {
      return false;
    }
    if (filters.outcome !== "all" && getOutcome(log) !== filters.outcome) {
      return false;
    }
    if (filters.platform !== "all" && getPlatform(log) !== filters.platform) {
      return false;
    }
    if (!matchesTimeRange(log, timeRange)) {
      return false;
    }
    if (query && !getSearchText(log).includes(query)) {
      return false;
    }
    return true;
  });
}

function matchesSeverity(log: DebugLogEntry): boolean {
  switch (filters.severity) {
    case "all":
      return true;
    case "warn_error":
      return log.severity === "warn" || log.severity === "error";
    case "error":
      return log.severity === "error";
    case "warn":
      return log.severity === "warn";
    case "info_debug":
      return log.severity === "info" || log.severity === "debug";
    default:
      return exhaustive(filters.severity);
  }
}

function matchesTimeRange(log: DebugLogEntry, timeRange: TimeRange): boolean {
  if (!timeRange.enabled) {
    return true;
  }

  const timestamp = getTimestamp(log);
  return timestamp === undefined || (timestamp >= timeRange.start && timestamp <= timeRange.end);
}

function getStats(logs: DebugLogEntry[]): DebugStats {
  const postTerminalLogs = logs.filter((log) => isPostSuccess(log) || isPostFailure(log));
  const postSuccessCount = logs.filter(isPostSuccess).length;
  const postFailureCount = logs.filter(isPostFailure).length;
  const postTotal = postSuccessCount + postFailureCount;
  const postDurations = postTerminalLogs
    .map((log) => getPayloadNumber(log, "durationMs"))
    .filter(isNumber);
  const geminiDurations = logs
    .filter(isPostGeminiTerminal)
    .map((log) => getPayloadNumber(log, "durationMs"))
    .filter(isNumber);

  return {
    visibleCount: logs.length,
    postSuccessCount,
    postFailureCount,
    successRate: formatRate(postSuccessCount, postTotal),
    failureRate: formatRate(postFailureCount, postTotal),
    averagePostDuration: formatNullableMs(average(postDurations)),
    averageGeminiLatency: formatNullableMs(average(geminiDurations)),
    p95GeminiLatency: formatNullableMs(percentile(geminiDurations, 95))
  };
}

function isPostSuccess(log: DebugLogEntry): boolean {
  return log.source === "content" && log.event === "marker_rendered" && !isValidation(log);
}

function isPostFailure(log: DebugLogEntry): boolean {
  return log.source === "content" && log.event === "analysis_error" && !isValidation(log);
}

function isPostGeminiTerminal(log: DebugLogEntry): boolean {
  return (
    log.source === "gemini" &&
    !isValidation(log) &&
    ["gemini_success", "gemini_http_error", "gemini_invalid_response"].includes(log.event)
  );
}

function isValidation(log: DebugLogEntry): boolean {
  return getPayloadString(log, "purpose") === "validation";
}

function getOutcome(log: DebugLogEntry): DerivedOutcome {
  if (isCacheLog(log)) {
    return "cache";
  }
  if (log.event.includes("skipped") || log.event.includes("blocked")) {
    return "skipped_blocked";
  }
  if (log.event.includes("error") || log.event.includes("invalid")) {
    return "failure";
  }
  if (log.event.includes("success") || log.event === "marker_rendered") {
    return "success";
  }
  if (
    log.event.includes("start") ||
    log.event.includes("requested") ||
    log.event.includes("pending") ||
    log.event.includes("retry")
  ) {
    return "in_progress";
  }
  return "other";
}

function isCacheLog(log: DebugLogEntry): boolean {
  return log.event === "cache_hit" || (log.event === "marker_rendered" && getPayloadString(log, "source") === "cache");
}

function getPlatform(log: DebugLogEntry): PlatformFilter {
  const platform = getPayloadString(log, "platform");
  if (platform === "linkedin" || platform === "x") {
    return platform;
  }
  return "unknown";
}

function getSearchText(log: DebugLogEntry): string {
  const payloadValues = log.payload
    ? Object.entries(log.payload).flatMap(([key, value]) => [key, String(value)])
    : [];
  return [log.event, log.source, log.severity, ...payloadValues].join(" ").toLowerCase();
}

function getTimeRange(logs: DebugLogEntry[]): TimeRange {
  const timestamps = logs.map(getTimestamp).filter(isNumber);
  if (!timestamps.length) {
    return { min: 0, max: 0, start: 0, end: 0, enabled: false };
  }

  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const start = clamp(filters.startMs ?? min, min, max);
  const end = clamp(filters.endMs ?? max, min, max);
  return {
    min,
    max,
    start: Math.min(start, end),
    end: Math.max(start, end),
    enabled: min !== max
  };
}

function getTimestamp(log: DebugLogEntry): number | undefined {
  const timestamp = new Date(log.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function getPayloadString(log: DebugLogEntry, key: string): string | undefined {
  const value = log.payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function getPayloadNumber(log: DebugLogEntry, key: string): number | undefined {
  const value = log.payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function average(values: number[]): number | undefined {
  if (!values.length) {
    return undefined;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], percentileValue: number): number | undefined {
  if (!values.length) {
    return undefined;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index];
}

function getRangeStep(timeRange: TimeRange): number {
  if (!timeRange.enabled) {
    return 1;
  }
  return Math.max(1_000, Math.round((timeRange.max - timeRange.min) / 500));
}

function formatRangeLabel(timeRange: TimeRange): string {
  if (!currentLogs.length) {
    return "No events";
  }
  return `${formatDateTime(timeRange.start)} to ${formatDateTime(timeRange.end)}`;
}

function formatRate(count: number, total: number): string {
  if (!total) {
    return "n/a";
  }
  return `${Math.round((count / total) * 100)}%`;
}

function formatNullableMs(value: number | undefined): string {
  return value === undefined ? "n/a" : formatMs(value);
}

function formatMs(value: number): string {
  if (value < 1_000) {
    return `${Math.round(value)} ms`;
  }
  return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)} s`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString();
}

function formatDateTime(value: number): string {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
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

function platformLabel(platform: PlatformFilter): string {
  if (platform === "linkedin") {
    return "LinkedIn";
  }
  if (platform === "x") {
    return "X";
  }
  if (platform === "unknown") {
    return "Unknown";
  }
  return "All platforms";
}

function outcomeLabel(outcome: DerivedOutcome): string {
  return outcome.replaceAll("_", " ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function exhaustive(value: never): never {
  throw new Error(`Unhandled debug filter value: ${String(value)}`);
}

export {};
