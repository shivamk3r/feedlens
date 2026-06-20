import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import type {
  AnalysisResult,
  AnalyzePostResponse,
  BackgroundMessage,
  ExtractedPost,
  SetupStatus
} from "../src/shared/types";
import { getChromeMock } from "./helpers/chrome";

const setupStatus: SetupStatus = {
  settings: {
    ...DEFAULT_SETTINGS,
    privacyAccepted: true
  },
  hasApiKey: true,
  apiKeyHealth: {
    status: "valid",
    checkedAt: "2026-06-17T00:00:00.000Z",
    model: DEFAULT_SETTINGS.model
  },
  setup: {
    code: "ready",
    ready: true,
    label: "Ready",
    detail: "Gemini analysis check passed."
  },
  cacheEntryCount: 0
};

interface VisiblePostEntry {
  element: HTMLElement;
  post: ExtractedPost;
}

const validAnalysis: AnalysisResult = {
  marker: "yellow",
  confidence: "medium",
  information_quality_score: 45,
  misinformation_risk_score: 35,
  manipulation_pressure_score: 20,
  overall_risk_score: 40,
  summary: "The post has useful information but limited sourcing.",
  signals: [
    {
      type: "missing_evidence",
      severity: "medium",
      evidence: "needs context",
      explanation: "The post asks for care but does not include sources."
    }
  ],
  counter_reading: "It may be intentionally concise.",
  suggested_user_action: "Look for source links before relying on the claim."
};

afterEach(() => {
  vi.doUnmock("../src/content/extract");
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("content script extension lifecycle", () => {
  it("handles extension context invalidation from a scheduled scan without an unhandled rejection", async () => {
    vi.useFakeTimers();
    const unhandled = collectUnhandledRejections();

    try {
      const chromeMock = await loadContentScriptWithEntries([makeVisiblePostEntry()]);
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(1);

      chromeMock.runtime.sendMessage.mockRejectedValue(new Error("Extension context invalidated."));
      await vi.advanceTimersByTimeAsync(500);
      await flushMicrotasks();

      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(2);
      expect(unhandled.rejections).toHaveLength(0);
      expect(chromeMock.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
      expect(chromeMock.runtime.onMessage.removeListener).toHaveBeenCalledTimes(1);
    } finally {
      unhandled.stop();
    }
  });

  it("does not send more runtime messages after invalidation on scroll, mutation, or storage changes", async () => {
    vi.useFakeTimers();
    const chromeMock = await loadContentScriptWithEntries([makeVisiblePostEntry()]);

    chromeMock.runtime.sendMessage.mockRejectedValue(new Error("Extension context invalidated."));
    await vi.advanceTimersByTimeAsync(500);
    await flushMicrotasks();
    const callCountAfterInvalidation = chromeMock.runtime.sendMessage.mock.calls.length;

    window.dispatchEvent(new Event("scroll"));
    document.body.append(document.createElement("span"));
    getStorageChangedListener()(
      { "feedlens.enabled": { oldValue: false, newValue: true } },
      "local"
    );
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(700);

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(callCountAfterInvalidation);
  });

  it("backs off automatic invalid-response retries but allows manual reanalysis", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T00:00:00.000Z"));
    const entry = makeVisiblePostEntry();
    const analysisResponses: AnalyzePostResponse[] = [
      {
        ok: false,
        hash: entry.post.hash,
        error: {
          code: "invalid_response",
          message: "Gemini returned an invalid response. Try again in a moment.",
          retryable: true
        }
      },
      {
        ok: true,
        hash: entry.post.hash,
        result: validAnalysis,
        source: "gemini"
      }
    ];
    const chromeMock = await loadContentScriptWithRuntime(entriesOf(entry), async (message) => {
      if (message.type === "feedlens:getStatus") {
        return setupStatus;
      }
      if (message.type === "feedlens:analyzePost") {
        return analysisResponses.shift();
      }
      return { ok: true };
    });

    await vi.advanceTimersByTimeAsync(500);
    await flushMicrotasks();
    expect(countRuntimeMessages(chromeMock, "feedlens:analyzePost")).toBe(1);

    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(500);
    await flushMicrotasks();
    expect(countRuntimeMessages(chromeMock, "feedlens:analyzePost")).toBe(1);

    const sendResponse = vi.fn();
    getContentMessageListener()(
      { type: "feedlens-content:reanalyzeVisible" },
      {} as chrome.runtime.MessageSender,
      sendResponse
    );
    await flushMicrotasks();

    expect(countRuntimeMessages(chromeMock, "feedlens:analyzePost")).toBe(2);
  });

  it("does not back off non-retryable analysis errors", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T00:00:00.000Z"));
    const entry = makeVisiblePostEntry();
    const chromeMock = await loadContentScriptWithRuntime(entriesOf(entry), async (message) => {
      if (message.type === "feedlens:getStatus") {
        return setupStatus;
      }
      if (message.type === "feedlens:analyzePost") {
        return {
          ok: false,
          hash: entry.post.hash,
          error: {
            code: "provider_error",
            message: "Gemini returned an error. Check your API key, billing status, or rate limits.",
            retryable: false
          }
        };
      }
      return { ok: true };
    });

    await vi.advanceTimersByTimeAsync(500);
    await flushMicrotasks();
    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(500);
    await flushMicrotasks();

    expect(countRuntimeMessages(chromeMock, "feedlens:analyzePost")).toBeGreaterThan(1);
  });
});

async function loadContentScriptWithEntries(entries: VisiblePostEntry[]) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.doMock("../src/content/extract", async () => {
    const actual = await vi.importActual<typeof import("../src/content/extract")>(
      "../src/content/extract"
    );

    return {
      ...actual,
      getCurrentPlatformAdapter: vi.fn(() => actual.getPlatformAdapter("x")),
      getVisiblePostEntries: vi.fn(async () => entries),
      isSupportedPlatformPage: vi.fn(() => true)
    };
  });

  const chromeMock = getChromeMock();
  chromeMock.runtime.sendMessage.mockResolvedValueOnce(setupStatus);
  await import("../src/content/index");
  await flushMicrotasks();
  return chromeMock;
}

async function loadContentScriptWithRuntime(
  entries: VisiblePostEntry[],
  sendMessage: (message: BackgroundMessage) => Promise<unknown>
) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.doMock("../src/content/extract", async () => {
    const actual = await vi.importActual<typeof import("../src/content/extract")>(
      "../src/content/extract"
    );

    return {
      ...actual,
      getCurrentPlatformAdapter: vi.fn(() => actual.getPlatformAdapter("x")),
      getVisiblePostEntries: vi.fn(async () => entries),
      isSupportedPlatformPage: vi.fn(() => true)
    };
  });

  const chromeMock = getChromeMock();
  chromeMock.runtime.sendMessage.mockImplementation(sendMessage);
  await import("../src/content/index");
  await flushMicrotasks();
  return chromeMock;
}

function entriesOf(entry: VisiblePostEntry): VisiblePostEntry[] {
  return [entry];
}

function makeVisiblePostEntry(): VisiblePostEntry {
  const element = document.createElement("article");
  document.body.append(element);

  return {
    element,
    post: {
      platform: "x",
      postId: "x:status:1234567890",
      hash: "hash-1234567890",
      text: "AI policy claims need context, sources, and clear uncertainty.",
      author: "Maya Researcher",
      url: "https://x.com/maya/status/1234567890",
      detectedAt: "2026-06-17T00:00:00.000Z"
    }
  };
}

function getStorageChangedListener(): (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
) => void {
  const listener = getChromeMock().storage.onChanged.addListener.mock.calls[0]?.[0];
  expect(listener).toBeTypeOf("function");
  return listener as (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => void;
}

function getContentMessageListener(): (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => true {
  const listener = getChromeMock().runtime.onMessage.addListener.mock.calls[0]?.[0];
  expect(listener).toBeTypeOf("function");
  return listener as (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => true;
}

function countRuntimeMessages(chromeMock: ReturnType<typeof getChromeMock>, type: string): number {
  return chromeMock.runtime.sendMessage.mock.calls.filter(
    ([message]) => (message as { type?: string } | undefined)?.type === type
  ).length;
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

function collectUnhandledRejections(): {
  rejections: unknown[];
  stop: () => void;
} {
  const rejections: unknown[] = [];
  const handler = (reason: unknown) => {
    rejections.push(reason);
  };

  process.on("unhandledRejection", handler);
  return {
    rejections,
    stop: () => process.off("unhandledRejection", handler)
  };
}
