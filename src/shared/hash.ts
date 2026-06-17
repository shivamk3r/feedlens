const encoder = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeForHash(input: string): string {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function createPostHash(text: string): Promise<string> {
  return sha256Hex(normalizeForHash(text));
}

export async function createCacheKey(
  postText: string,
  model: string,
  promptVersion: string
): Promise<string> {
  return sha256Hex(`${normalizeForHash(postText)}\n${model}\n${promptVersion}`);
}
