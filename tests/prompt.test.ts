import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import { SYSTEM_PROMPT, buildUserPrompt } from "../src/shared/prompt";

describe("FeedLens prompt guardrails", () => {
  it("handles recent-news claims without assuming model knowledge is current", () => {
    const userPrompt = buildUserPrompt(
      "A surprising acquisition was announced this week.",
      DEFAULT_SETTINGS
    );

    expect(SYSTEM_PROMPT).toContain("lack of model knowledge");
    expect(userPrompt).toContain("events newer than your model knowledge");
    expect(userPrompt).toContain("suggest checking current sources");
  });
});
