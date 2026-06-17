import { createPostHash } from "../shared/hash";
import type { ExtractedPost } from "../shared/types";

const POST_SELECTORS = [
  "div.feed-shared-update-v2",
  "article[data-urn]",
  "div[data-urn*='urn:li:activity']",
  "div[data-id*='urn:li:activity']"
].join(",");

const REMOVE_SELECTORS = [
  ".feedlens-marker",
  ".feedlens-detail",
  ".feedlens-status",
  ".feed-shared-social-action-bar",
  ".social-details-social-counts",
  ".comments-comment-item",
  ".comments-comments-list",
  ".update-components-actor__name",
  ".feed-shared-actor__name",
  ".update-components-actor__meta-link",
  ".feed-shared-actor__meta-link",
  ".update-components-actor__sub-description",
  ".feed-shared-actor__sub-description",
  "[data-test-id='actor-name']",
  "button",
  "input",
  "textarea",
  "select",
  "svg",
  "img",
  "video",
  "[role='button']",
  "[aria-hidden='true']"
].join(",");

const AUTHOR_SELECTORS = [
  ".update-components-actor__name",
  ".feed-shared-actor__name",
  "[data-test-id='actor-name']",
  "a.update-components-actor__meta-link span[aria-hidden='true']"
];

const UI_TEXT = new Set([
  "like",
  "comment",
  "repost",
  "send",
  "follow",
  "connect",
  "message",
  "see more",
  "show more",
  "see translation",
  "permalink",
  "view profile",
  "activate to view larger image",
  "feed lens"
]);

export interface ExtractVisiblePostsOptions {
  root?: ParentNode;
  minTextLength?: number;
  maxPosts?: number;
  now?: Date;
}

export async function getVisiblePosts({
  root = document,
  minTextLength = 50,
  maxPosts = 12,
  now = new Date()
}: ExtractVisiblePostsOptions = {}): Promise<ExtractedPost[]> {
  const entries = await getVisiblePostEntries({ root, minTextLength, maxPosts, now });
  return entries.map((entry) => entry.post);
}

export async function getVisiblePostEntries({
  root = document,
  minTextLength = 50,
  maxPosts = 12,
  now = new Date()
}: ExtractVisiblePostsOptions = {}): Promise<Array<{ element: HTMLElement; post: ExtractedPost }>> {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(POST_SELECTORS))
    .filter((element) => !hasAncestorPost(element))
    .filter(isVisiblePost);

  const entries: Array<{ element: HTMLElement; post: ExtractedPost }> = [];
  const seen = new Set<string>();

  for (const element of candidates) {
    const text = extractPostText(element);
    if (text.length < minTextLength) {
      continue;
    }

    const hash = await createPostHash(text);
    if (seen.has(hash)) {
      continue;
    }

    seen.add(hash);
    entries.push({
      element,
      post: {
        postId: extractPostId(element, hash),
        hash,
        text,
        author: extractAuthor(element),
        url: extractPostUrl(element),
        detectedAt: now.toISOString()
      }
    });

    if (entries.length >= maxPosts) {
      break;
    }
  }

  return entries;
}

export function extractPostText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(REMOVE_SELECTORS).forEach((node) => node.remove());

  const rawText = getElementText(clone);
  const lines = rawText
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !isUiLine(line));

  const uniqueLines: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      uniqueLines.push(line);
      seen.add(key);
    }
  }

  return uniqueLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isVisiblePost(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < viewportHeight &&
    rect.left < viewportWidth &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

export function extractPostId(element: HTMLElement, fallbackHash: string): string {
  const directId =
    element.getAttribute("data-urn") ??
    element.getAttribute("data-id") ??
    element.querySelector<HTMLElement>("[data-urn]")?.getAttribute("data-urn") ??
    element.querySelector<HTMLElement>("[data-id]")?.getAttribute("data-id");

  return directId?.trim() || `feedlens:${fallbackHash.slice(0, 16)}`;
}

function extractAuthor(element: HTMLElement): string | undefined {
  for (const selector of AUTHOR_SELECTORS) {
    const author = element.querySelector<HTMLElement>(selector);
    const text = author ? cleanLine(getElementText(author)) : "";
    if (text && !isUiLine(text)) {
      return text.slice(0, 120);
    }
  }

  return undefined;
}

function extractPostUrl(element: HTMLElement): string | undefined {
  const link = element.querySelector<HTMLAnchorElement>(
    "a[href*='/feed/update/'], a[href*='urn:li:activity']"
  );

  if (!link?.href) {
    return undefined;
  }

  try {
    return new URL(link.href, window.location.href).toString();
  } catch {
    return undefined;
  }
}

function hasAncestorPost(element: HTMLElement): boolean {
  const parentPost = element.parentElement?.closest(POST_SELECTORS);
  return Boolean(parentPost);
}

function getElementText(element: HTMLElement): string {
  return "innerText" in element && typeof element.innerText === "string"
    ? element.innerText
    : (element.textContent ?? "");
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function isUiLine(line: string): boolean {
  const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    UI_TEXT.has(normalized) ||
    /^\d+(\.\d+)?[kKmM]?\s*(reactions?|comments?|reposts?)$/.test(normalized) ||
    /^(\d+\s*)?(like|comment|repost|send)$/.test(normalized)
  );
}
