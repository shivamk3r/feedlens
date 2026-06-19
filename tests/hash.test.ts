import { describe, expect, it } from "vitest";
import { createCacheKey, createPostHash, normalizeForHash } from "../src/shared/hash";
import { PROMPT_VERSION } from "../src/shared/types";

describe("hashing", () => {
  it("normalizes whitespace and case before hashing post text", async () => {
    await expect(createPostHash("  This   Is A Claim\n")).resolves.toEqual(
      await createPostHash("this is a claim")
    );
    expect(normalizeForHash("  A\n\nB  ")).toBe("a b");
  });

  it("includes model and prompt version in cache keys", async () => {
    const text = "A useful LinkedIn post with enough text to hash.";
    const first = await createCacheKey(text, "model-a", PROMPT_VERSION);
    const second = await createCacheKey(text, "model-b", PROMPT_VERSION);
    expect(first).not.toEqual(second);
  });

  it("separates post and cache hashes by platform", async () => {
    const text = "The same visible post text can appear on multiple platforms.";

    await expect(createPostHash(text, "linkedin")).resolves.not.toEqual(
      await createPostHash(text, "x")
    );
    await expect(createCacheKey(text, "model-a", PROMPT_VERSION, "linkedin")).resolves.not.toEqual(
      await createCacheKey(text, "model-a", PROMPT_VERSION, "x")
    );
  });
});
