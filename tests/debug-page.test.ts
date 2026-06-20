import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DebugLogEntry } from "../src/shared/types";
import { getChromeMock } from "./helpers/chrome";

const logs: DebugLogEntry[] = [
  {
    id: "5",
    createdAt: "2026-06-17T00:04:00.000Z",
    source: "background",
    severity: "info",
    event: "cache_hit",
    payload: {
      hash: "cache1",
      platform: "linkedin",
      purpose: "post_analysis"
    }
  },
  {
    id: "4",
    createdAt: "2026-06-17T00:03:00.000Z",
    source: "gemini",
    severity: "warn",
    event: "gemini_http_error",
    payload: {
      hash: "err1",
      platform: "x",
      purpose: "post_analysis",
      status: 429,
      durationMs: 2400
    }
  },
  {
    id: "3",
    createdAt: "2026-06-17T00:02:00.000Z",
    source: "gemini",
    severity: "info",
    event: "gemini_success",
    payload: {
      hash: "ok1",
      platform: "linkedin",
      purpose: "post_analysis",
      durationMs: 1600,
      marker: "green",
      confidence: "high"
    }
  },
  {
    id: "2",
    createdAt: "2026-06-17T00:01:00.000Z",
    source: "content",
    severity: "warn",
    event: "analysis_error",
    payload: {
      hash: "err1",
      platform: "x",
      code: "invalid_response",
      retryable: true,
      durationMs: 800
    }
  },
  {
    id: "1",
    createdAt: "2026-06-17T00:00:00.000Z",
    source: "content",
    severity: "info",
    event: "marker_rendered",
    payload: {
      hash: "ok1",
      platform: "linkedin",
      source: "gemini",
      marker: "green",
      confidence: "high",
      durationMs: 1200
    }
  }
];

async function loadDebugPage(debugLogs: DebugLogEntry[] = logs): Promise<HTMLElement> {
  vi.resetModules();
  const chromeMock = getChromeMock();
  chromeMock.runtime.sendMessage.mockImplementation(async (message: { type: string }) => {
    if (message.type === "feedlens:getDebugLogs") {
      return { ok: true, logs: debugLogs };
    }
    return { ok: true };
  });
  document.body.innerHTML = `<main id="feedlens-debug-root" class="fl-shell"></main>`;
  await import("../src/debug/index");
  await settle();
  return document.querySelector<HTMLElement>("#feedlens-debug-root")!;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

function setSelect(root: HTMLElement, id: string, value: string): void {
  const select = root.querySelector<HTMLSelectElement>(id);
  expect(select).toBeTruthy();
  select!.value = value;
  select!.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("debug logs page", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders filtered stats and latency summaries", async () => {
    const root = await loadDebugPage();

    expect(root.textContent).toContain("Visible logs");
    expect(root.textContent).toContain("Post successes");
    expect(root.textContent).toContain("Post failures");
    expect(root.textContent).toContain("Success rate");
    expect(root.textContent).toContain("Failure rate");
    expect(root.textContent).toContain("50%");
    expect(root.textContent).toContain("1.0 s");
    expect(root.textContent).toContain("2.0 s");
    expect(root.textContent).toContain("2.4 s");
  });

  it("filters warnings and errors", async () => {
    const root = await loadDebugPage();

    setSelect(root, "#debug-filter-severity", "warn_error");

    expect(root.querySelectorAll(".fl-debug-log")).toHaveLength(2);
    expect(root.textContent).toContain("analysis_error");
    expect(root.textContent).toContain("gemini_http_error");
    expect(root.textContent).not.toContain("marker_rendered");
  });

  it("filters by the selected time range", async () => {
    const root = await loadDebugPage();
    const start = root.querySelector<HTMLInputElement>("#debug-time-start");
    expect(start).toBeTruthy();

    start!.value = String(new Date("2026-06-17T00:02:00.000Z").getTime());
    start!.dispatchEvent(new Event("input", { bubbles: true }));

    expect(root.querySelectorAll(".fl-debug-log")).toHaveLength(3);
    expect(root.textContent).toContain("cache_hit");
    expect(root.textContent).toContain("gemini_success");
    expect(root.textContent).not.toContain("marker_rendered");
  });

  it("copies the current filtered JSON", async () => {
    const writeText = vi.fn(async (_text: string): Promise<void> => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
    const root = await loadDebugPage();

    setSelect(root, "#debug-filter-source", "content");
    root.querySelector<HTMLButtonElement>("#debug-copy")?.click();
    await settle();

    expect(writeText).toHaveBeenCalledOnce();
    const copiedText = writeText.mock.calls[0]?.[0];
    if (typeof copiedText !== "string") {
      throw new Error("Expected copied debug logs to be a JSON string.");
    }
    const copied = JSON.parse(copiedText) as DebugLogEntry[];
    expect(copied).toHaveLength(2);
    expect(copied.every((log) => log.source === "content")).toBe(true);
  });

  it("shows distinct empty states for no logs and no matching logs", async () => {
    const emptyRoot = await loadDebugPage([]);
    expect(emptyRoot.textContent).toContain("No debug logs yet");

    const root = await loadDebugPage(logs);
    const query = root.querySelector<HTMLInputElement>("#debug-filter-query");
    expect(query).toBeTruthy();
    query!.value = "not-present-in-safe-fields";
    query!.dispatchEvent(new Event("input", { bubbles: true }));

    expect(root.textContent).toContain("No matching logs");
    expect(root.textContent).not.toContain("No debug logs yet");
  });
});
