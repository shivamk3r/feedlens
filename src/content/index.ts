import { ERROR_MESSAGES } from "../shared/defaults";
import type {
  AnalyzePostResponse,
  BackgroundMessage,
  ContentMessage,
  ContentState,
  ExtractedPost,
  FeedLensSettings,
  SetupStatus
} from "../shared/types";
import { getVisiblePostEntries } from "./extract";
import { clearMarker, renderError, renderMarker, renderPending } from "./render";

type PostStatus = "detected" | "pending" | "analyzed" | "error";

interface VisiblePostState {
  element: HTMLElement;
  post: ExtractedPost;
  status: PostStatus;
  lastError?: string;
}

const visiblePosts = new Map<string, VisiblePostState>();
const POST_LOOKAHEAD_VIEWPORT_RATIO = 1;
const MIN_POST_LOOKAHEAD_PIXELS = 600;
const MAX_POST_LOOKAHEAD_PIXELS = 1600;
let settings: FeedLensSettings | undefined;
let hasApiKey = false;
let manualPaused = false;
let scanTimer: number | undefined;
let lastError: string | undefined;
let observer: MutationObserver | undefined;

bootstrap();

function bootstrap(): void {
  if (!isLinkedInPage()) {
    return;
  }

  document.documentElement.dataset.feedlensLoaded = "true";
  chrome.runtime.onMessage.addListener(handleContentMessage);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && Object.keys(changes).some((key) => key.startsWith("feedlens."))) {
      void refreshStatus().then(() => scheduleScan());
    }
  });

  window.addEventListener("scroll", () => scheduleScan(), { passive: true });
  window.addEventListener("focus", () => scheduleScan(), { passive: true });

  observer = new MutationObserver(() => scheduleScan());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  void refreshStatus().then(() => scheduleScan());
}

function handleContentMessage(
  message: ContentMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): true {
  void (async () => {
    switch (message.type) {
      case "feedlens-content:getState":
        sendResponse(getContentState());
        return;

      case "feedlens-content:reanalyzeVisible":
        await refreshStatus();
        await scanVisible({ force: true, manual: true });
        sendResponse(getContentState());
        return;

      case "feedlens-content:reanalyzeHash":
        await refreshStatus();
        await reanalyzeHash(message.payload.hash);
        sendResponse(getContentState());
        return;

      case "feedlens-content:setPaused":
        manualPaused = message.payload.paused;
        if (!manualPaused) {
          scheduleScan();
        }
        sendResponse(getContentState());
        return;

      case "feedlens-content:clearVisibleResults":
        clearVisibleResults();
        sendResponse(getContentState());
        return;

      default:
        exhaustive(message);
    }
  })().catch((error: unknown) => {
    lastError = error instanceof Error ? error.message : "FeedLens hit an unexpected content error.";
    sendResponse(getContentState());
  });

  return true;
}

async function refreshStatus(): Promise<void> {
  const status = await sendBackgroundMessage<SetupStatus>({ type: "feedlens:getStatus" });
  settings = status.settings;
  hasApiKey = status.hasApiKey;
}

function scheduleScan(delay = 500): void {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    void scanVisible({ force: false, manual: false });
  }, delay);
}

async function scanVisible({ force, manual }: { force: boolean; manual: boolean }): Promise<void> {
  if (!settings) {
    await refreshStatus();
  }

  if (!settings) {
    return;
  }

  if (!manual && !isAutoAnalysisAllowed(settings)) {
    return;
  }

  const entries = await getVisiblePostEntries({
    maxPosts: settings.maxVisiblePostsPerRun,
    lookaheadPixels: manual ? 0 : getPostLookaheadPixels()
  });
  if (!entries.length) {
    if (manual) {
      lastError = ERROR_MESSAGES.noPosts;
    }
    return;
  }

  for (const { element, post } of entries) {
    const existing = visiblePosts.get(post.hash);
    if (existing?.status === "pending") {
      continue;
    }
    if (existing?.status === "analyzed" && !force) {
      continue;
    }

    visiblePosts.set(post.hash, { element, post, status: "detected" });
    await analyzeVisiblePost(element, post, force);
  }
}

async function reanalyzeHash(hash: string): Promise<void> {
  const entry = visiblePosts.get(hash);
  if (!entry) {
    await scanVisible({ force: false, manual: true });
    return;
  }

  await analyzeVisiblePost(entry.element, entry.post, true);
}

async function analyzeVisiblePost(
  element: HTMLElement,
  post: ExtractedPost,
  force: boolean
): Promise<void> {
  if (!settings) {
    return;
  }

  if (!hasApiKey) {
    renderError(element, ERROR_MESSAGES.missingApiKey);
    visiblePosts.set(post.hash, {
      element,
      post,
      status: "error",
      lastError: ERROR_MESSAGES.missingApiKey
    });
    return;
  }

  renderPending(element);
  visiblePosts.set(post.hash, { element, post, status: "pending" });

  const response = await sendBackgroundMessage<AnalyzePostResponse>({
    type: "feedlens:analyzePost",
    payload: { post, force }
  });

  if (response.ok) {
    renderMarker({
      host: element,
      result: response.result,
      source: response.source,
      settings,
      onSelect: () => {
        void sendBackgroundMessage({ type: "feedlens:selectResult", payload: { hash: post.hash } });
      }
    });
    visiblePosts.set(post.hash, { element, post, status: "analyzed" });
    lastError = undefined;
    return;
  }

  renderError(element, response.error.message);
  visiblePosts.set(post.hash, {
    element,
    post,
    status: "error",
    lastError: response.error.message
  });
  lastError = response.error.message;
}

function clearVisibleResults(): void {
  for (const state of visiblePosts.values()) {
    clearMarker(state.element);
  }
  visiblePosts.clear();
  lastError = undefined;
}

function getContentState(): ContentState {
  const states = Array.from(visiblePosts.values());
  return {
    detectedCount: states.length,
    analyzedCount: states.filter((state) => state.status === "analyzed").length,
    pendingCount: states.filter((state) => state.status === "pending").length,
    errorCount: states.filter((state) => state.status === "error").length,
    paused: manualPaused || Boolean(settings && !settings.enabled),
    lastError,
    isLinkedIn: isLinkedInPage()
  };
}

function isAutoAnalysisAllowed(currentSettings: FeedLensSettings): boolean {
  return (
    currentSettings.enabled &&
    currentSettings.backgroundAnalysis &&
    currentSettings.privacyAccepted &&
    hasApiKey &&
    !manualPaused
  );
}

function getPostLookaheadPixels(): number {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  if (!viewportHeight) {
    return 0;
  }

  return Math.min(
    MAX_POST_LOOKAHEAD_PIXELS,
    Math.max(MIN_POST_LOOKAHEAD_PIXELS, Math.round(viewportHeight * POST_LOOKAHEAD_VIEWPORT_RATIO))
  );
}

function isLinkedInPage(): boolean {
  return location.hostname === "www.linkedin.com" || location.hostname.endsWith(".linkedin.com");
}

function sendBackgroundMessage<T = unknown>(message: BackgroundMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

function exhaustive(value: never): never {
  throw new Error(`Unsupported FeedLens content message: ${JSON.stringify(value)}`);
}

export {};
