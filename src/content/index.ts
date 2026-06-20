import { ERROR_MESSAGES } from "../shared/defaults";
import { isDebugLoggingEnabled } from "../shared/debug";
import type {
  AppendDebugLogRequest,
  AnalyzePostResponse,
  BackgroundMessage,
  ContentMessage,
  ContentState,
  ExtractedPost,
  FeedLensSettings,
  SetupStatus
} from "../shared/types";
import {
  getCurrentPlatformAdapter,
  getVisiblePostEntries,
  isSupportedPlatformPage
} from "./extract";
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
const EXTENSION_CONTEXT_INVALIDATED_MESSAGE = "Extension context invalidated.";
const platform = getCurrentPlatformAdapter();
let settings: FeedLensSettings | undefined;
let hasApiKey = false;
let manualPaused = false;
let scanTimer: number | undefined;
let lastError: string | undefined;
let observer: MutationObserver | undefined;
let extensionContextValid = true;

bootstrap();

function bootstrap(): void {
  if (!platform) {
    return;
  }

  document.documentElement.dataset.feedlensLoaded = "true";
  document.documentElement.dataset.feedlensPlatform = platform.id;
  logDebug("bootstrap", { host: location.hostname, platform: platform.id });
  chrome.runtime.onMessage.addListener(handleContentMessage);
  chrome.storage.onChanged.addListener(handleStorageChanged);

  window.addEventListener("scroll", handlePageActivity, { passive: true });
  window.addEventListener("focus", handlePageActivity, { passive: true });

  observer = new MutationObserver(handlePageActivity);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  runSafely(async () => {
    await refreshStatus();
    scheduleScan();
  });
}

function handleStorageChanged(
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
): void {
  if (!extensionContextValid) {
    return;
  }

  if (areaName === "local" && Object.keys(changes).some((key) => key.startsWith("feedlens."))) {
    runSafely(async () => {
      await refreshStatus();
      scheduleScan();
    });
  }
}

function handlePageActivity(): void {
  scheduleScan();
}

function handleContentMessage(
  message: ContentMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): true {
  runSafely(async () => {
    if (!extensionContextValid) {
      return;
    }

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
        logDebug("pause_changed", { paused: manualPaused });
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
  }, (error: unknown) => {
    if (isExtensionContextInvalidated(error)) {
      invalidateExtensionContext();
      return;
    }

    lastError = error instanceof Error ? error.message : "FeedLens hit an unexpected content error.";
    logDebug(
      "content_message_error",
      { name: error instanceof Error ? error.name || "Error" : "unknown" },
      "error"
    );
    sendResponse(getContentState());
  });

  return true;
}

async function refreshStatus(): Promise<void> {
  if (!extensionContextValid) {
    return;
  }

  const status = await sendBackgroundMessage<SetupStatus>({ type: "feedlens:getStatus" });
  if (!extensionContextValid) {
    return;
  }

  settings = status.settings;
  hasApiKey = status.hasApiKey;
  logDebug("status_refreshed", {
    enabled: status.settings.enabled,
    privacyAccepted: status.settings.privacyAccepted,
    hasApiKey,
    cacheEntryCount: status.cacheEntryCount,
    backgroundAnalysis: status.settings.backgroundAnalysis
  });
}

function scheduleScan(delay = 500): void {
  if (!extensionContextValid) {
    return;
  }

  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    runSafely(async () => {
      await scanVisible({ force: false, manual: false });
    });
  }, delay);
}

async function scanVisible({ force, manual }: { force: boolean; manual: boolean }): Promise<void> {
  if (!platform || !extensionContextValid) {
    return;
  }

  if (!settings) {
    await refreshStatus();
  }

  if (!settings) {
    logDebug("scan_skipped", { reason: "missing_settings", manual, force }, "warn");
    return;
  }

  if (!isSupportedPlatformPage(platform)) {
    if (manual) {
      lastError = ERROR_MESSAGES.unsupportedPlatform;
    }
    logDebug("scan_skipped", {
      reason: "unsupported_route",
      platform: platform.id,
      manual,
      force
    });
    return;
  }

  if (!manual && !isAutoAnalysisAllowed(settings)) {
    logDebug("scan_skipped", {
      reason: "auto_not_allowed",
      enabled: settings.enabled,
      backgroundAnalysis: settings.backgroundAnalysis,
      privacyAccepted: settings.privacyAccepted,
      hasApiKey,
      manualPaused
    });
    return;
  }

  const lookaheadPixels = manual ? 0 : getPostLookaheadPixels();
  logDebug("scan_started", {
    force,
    manual,
    platform: platform.id,
    maxPosts: settings.maxVisiblePostsPerRun,
    lookaheadPixels
  });

  const entries = await getVisiblePostEntries({
    maxPosts: settings.maxVisiblePostsPerRun,
    lookaheadPixels,
    platform
  });
  logDebug("posts_extracted", { count: entries.length, manual, force });
  if (!entries.length) {
    if (manual) {
      lastError = ERROR_MESSAGES.noPosts;
    }
    return;
  }

  for (const { element, post } of entries) {
    const existing = visiblePosts.get(post.hash);
    if (existing?.status === "pending") {
      logDebug("scan_skipped_post", { reason: "pending", hash: post.hash });
      continue;
    }
    if (existing?.status === "analyzed" && !force) {
      logDebug("scan_skipped_post", { reason: "already_analyzed", hash: post.hash });
      continue;
    }

    visiblePosts.set(post.hash, { element, post, status: "detected" });
    await analyzeVisiblePost(element, post, force);
  }
}

async function reanalyzeHash(hash: string): Promise<void> {
  const entry = visiblePosts.get(hash);
  if (!entry) {
    logDebug("reanalyze_hash_miss", { hash });
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
    logDebug("analysis_skipped", { reason: "missing_settings", hash: post.hash }, "warn");
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
    logDebug("analysis_error", {
      hash: post.hash,
      code: "missing_api_key",
      retryable: false
    }, "warn");
    return;
  }

  renderPending(element);
  visiblePosts.set(post.hash, { element, post, status: "pending" });
  logDebug("analysis_requested", { hash: post.hash, force });

  const response = await sendBackgroundMessage<AnalyzePostResponse>({
    type: "feedlens:analyzePost",
    payload: { post, force }
  });

  if (response.ok) {
    renderMarker({
      host: element,
      result: response.result,
      source: response.source,
      settings
    });
    visiblePosts.set(post.hash, { element, post, status: "analyzed" });
    lastError = undefined;
    logDebug("marker_rendered", {
      hash: post.hash,
      marker: response.result.marker,
      source: response.source
    });
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
  logDebug("analysis_error", {
    hash: post.hash,
    code: response.error.code,
    retryable: response.error.retryable
  }, response.error.retryable ? "warn" : "error");
}

function clearVisibleResults(): void {
  const clearedCount = visiblePosts.size;
  for (const state of visiblePosts.values()) {
    clearMarker(state.element);
  }
  visiblePosts.clear();
  lastError = undefined;
  logDebug("markers_cleared", { count: clearedCount });
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
    supported: Boolean(platform && isSupportedPlatformPage(platform)),
    platform: platform?.id,
    platformLabel: platform?.label
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

function sendBackgroundMessage<T = unknown>(message: BackgroundMessage): Promise<T> {
  if (!extensionContextValid) {
    return Promise.reject(new Error(EXTENSION_CONTEXT_INVALIDATED_MESSAGE));
  }

  return (async () => {
    try {
      return (await chrome.runtime.sendMessage(message)) as T;
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        invalidateExtensionContext();
      }
      throw error;
    }
  })();
}

function logDebug(
  event: string,
  payload?: Record<string, string | number | boolean>,
  severity: AppendDebugLogRequest["severity"] = "info"
): void {
  if (!isDebugLoggingEnabled() || !extensionContextValid) {
    return;
  }

  void sendBackgroundMessage({
    type: "feedlens:appendDebugLog",
    payload: { source: "content", severity, event, payload }
  }).catch((error: unknown) => {
    if (isExtensionContextInvalidated(error)) {
      invalidateExtensionContext();
    }
  });
}

function runSafely(
  task: () => Promise<void>,
  onError: (error: unknown) => void = handleAsyncError
): void {
  void task().catch(onError);
}

function handleAsyncError(error: unknown): void {
  if (isExtensionContextInvalidated(error)) {
    invalidateExtensionContext();
    return;
  }

  logDebug(
    "content_async_error",
    { name: error instanceof Error ? error.name || "Error" : "unknown" },
    "error"
  );
}

function isExtensionContextInvalidated(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("extension context invalidated");
}

function invalidateExtensionContext(): void {
  if (!extensionContextValid) {
    return;
  }

  extensionContextValid = false;
  window.clearTimeout(scanTimer);
  scanTimer = undefined;
  observer?.disconnect();
  observer = undefined;
  window.removeEventListener("scroll", handlePageActivity);
  window.removeEventListener("focus", handlePageActivity);

  try {
    chrome.storage.onChanged.removeListener(handleStorageChanged);
  } catch {
    // The extension runtime is already gone; local page cleanup above is enough.
  }

  try {
    chrome.runtime.onMessage.removeListener(handleContentMessage);
  } catch {
    // The extension runtime is already gone; local page cleanup above is enough.
  }
}

function exhaustive(value: never): never {
  throw new Error(`Unsupported FeedLens content message: ${JSON.stringify(value)}`);
}

export {};
