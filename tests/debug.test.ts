import { describe, expect, it, vi } from "vitest";
import {
  appendDebugLog,
  clearDebugLogs,
  getDebugLogs,
  sanitizeDebugPayload
} from "../src/shared/debug";
import { getChromeMock } from "./helpers/chrome";

describe("debug log storage", () => {
  it("stores sanitized debug logs in session storage", async () => {
    await appendDebugLog({
      source: "content",
      event: "analysis_requested",
      payload: {
        hash: "abc123",
        force: true,
        apiKey: "secret",
        postText: "raw LinkedIn post text",
        nested: { unsafe: true }
      }
    });

    const logs = await getDebugLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      source: "content",
      severity: "info",
      event: "analysis_requested",
      payload: {
        hash: "abc123",
        force: true
      }
    });
    expect(JSON.stringify(getChromeMock().storage.session.data)).not.toContain("secret");
    expect(JSON.stringify(getChromeMock().storage.session.data)).not.toContain("raw LinkedIn post text");
  });

  it("keeps only the newest 200 debug logs", async () => {
    for (let index = 0; index < 205; index += 1) {
      await appendDebugLog({
        source: "background",
        event: "event",
        payload: { index }
      });
    }

    const logs = await getDebugLogs();
    expect(logs).toHaveLength(200);
    expect(logs[0]?.payload?.index).toBe(204);
    expect(logs.at(-1)?.payload?.index).toBe(5);
  });

  it("clears debug logs", async () => {
    await appendDebugLog({ source: "gemini", event: "gemini_success" });
    await clearDebugLogs();

    await expect(getDebugLogs()).resolves.toEqual([]);
  });

  it("drops risky and non-flat payload fields", () => {
    expect(
      sanitizeDebugPayload({
        statusCode: 429,
        retryable: true,
        message: "Rate limited",
        responseBody: "raw response",
        promptVersion: "feedlens-v2",
        evidence: "quoted evidence",
        url: "https://example.test/post",
        array: ["not flat"]
      })
    ).toEqual({
      statusCode: 429,
      retryable: true,
      message: "Rate limited"
    });
  });

  it("allows safe response-shape diagnostics with risky substrings", () => {
    expect(
      sanitizeDebugPayload({
        textLength: 240,
        hasText: true,
        promptBlockReason: "none",
        postText: "raw post text",
        prompt: "raw prompt"
      })
    ).toEqual({
      textLength: 240,
      hasText: true,
      promptBlockReason: "none"
    });
  });

  it("no-ops outside development and test builds", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await appendDebugLog({ source: "content", event: "production_event" });

    await expect(getDebugLogs()).resolves.toEqual([]);
    expect(getChromeMock().storage.session.data).not.toHaveProperty("feedlens.debugLogs.session.v1");
  });
});
