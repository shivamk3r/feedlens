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
    const first = await createCacheKey(text, "gemini-2.5-flash", PROMPT_VERSION);
    const second = await createCacheKey(text, "gemini-2.5-pro", PROMPT_VERSION);
    expect(first).not.toEqual(second);
  });
});
