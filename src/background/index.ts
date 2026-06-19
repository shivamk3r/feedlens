import { analyzePost, clearCache, validateGeminiApiKey } from "./gemini";
import { appendDebugLog, clearDebugLogs, getDebugLogs } from "../shared/debug";
import { ERROR_MESSAGES } from "../shared/defaults";
import { getSetupStatus } from "../shared/storage";
import type { BackgroundMessage } from "../shared/types";

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  void handleMessage(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({
        ok: false,
        error: {
          code: "unknown",
          message: ERROR_MESSAGES.unexpected,
          retryable: true
        }
      });
    });

  return true;
});

async function handleMessage(message: BackgroundMessage): Promise<unknown> {
  switch (message.type) {
    case "feedlens:getStatus":
      return getSetupStatus();

    case "feedlens:analyzePost":
      return analyzePost(message.payload);

    case "feedlens:validateApiKey":
      return validateGeminiApiKey(message.payload.apiKey);

    case "feedlens:clearCache":
      await clearCache();
      return { ok: true };

    case "feedlens:getDebugLogs":
      return { ok: true, logs: await getDebugLogs() };

    case "feedlens:clearDebugLogs":
      await clearDebugLogs();
      return { ok: true };

    case "feedlens:appendDebugLog":
      await appendDebugLog(message.payload);
      return { ok: true };

    default:
      return exhaustive(message);
  }
}

function exhaustive(value: never): never {
  throw new Error(`Unsupported FeedLens message: ${JSON.stringify(value)}`);
}
