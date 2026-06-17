import { analyzePost, clearCache, validateGeminiApiKey } from "./gemini";
import { ERROR_MESSAGES } from "../shared/defaults";
import {
  getSessionResults,
  getSetupStatus,
  hideSessionResult,
  selectResult,
  setSessionResultFeedback
} from "../shared/storage";
import type { BackgroundMessage } from "../shared/types";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

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

    case "feedlens:getSessionResults":
      return { ok: true, results: await getSessionResults() };

    case "feedlens:hideResult":
      await hideSessionResult(message.payload.hash);
      return { ok: true };

    case "feedlens:setFeedback":
      await setSessionResultFeedback(message.payload.hash, message.payload.feedback);
      return { ok: true };

    case "feedlens:selectResult":
      await selectResult(message.payload.hash);
      return { ok: true };

    default:
      return exhaustive(message);
  }
}

function exhaustive(value: never): never {
  throw new Error(`Unsupported Feed Lens message: ${JSON.stringify(value)}`);
}
