import { createPostHash } from "../shared/hash";
import type { ExtractedPost, SupportedPlatformId } from "../shared/types";

type LocationLike = Pick<Location, "hostname" | "pathname">;

export interface PlatformAdapter {
  id: SupportedPlatformId;
  label: string;
  postSelectors: string;
  matchesLocation(location: LocationLike): boolean;
  isSupportedPath(location: LocationLike): boolean;
  extractPostText(element: HTMLElement): string;
  extractPostId(element: HTMLElement, fallbackHash: string): string;
  extractAuthor(element: HTMLElement): string | undefined;
  extractPostUrl(element: HTMLElement): string | undefined;
}

const LINKEDIN_POST_SELECTORS = [
  "[data-testid='mainFeed'] [role='listitem']",
  "[data-sdui-screen*='feed.MainFeed'] [role='listitem']",
  "div.feed-shared-update-v2",
  "article[data-urn]",
  "div[data-urn*='urn:li:activity']",
  "div[data-id*='urn:li:activity']"
].join(",");

const LINKEDIN_REMOVE_SELECTORS = [
  ".feedlens-marker",
  ".feedlens-detail",
  ".feedlens-status",
  ".feed-shared-social-action-bar",
  ".social-details-social-counts",
  ".comments-comment-item",
  ".comments-comments-list",
  "[data-testid*='comment' i]",
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
  "[data-vjs-player]",
  ".video-js",
  "[class*='vjs-']",
  "[role='button']",
  "[role='menu']",
  "[role='menuitem']",
  "[role='menuitemradio']",
  "[role='slider']",
  "[role='dialog']",
  "[aria-hidden='true']"
].join(",");

const LINKEDIN_AUTHOR_SELECTORS = [
  ".update-components-actor__name",
  ".feed-shared-actor__name",
  "[data-test-id='actor-name']",
  "a.update-components-actor__meta-link span[aria-hidden='true']"
];

const LINKEDIN_UI_TEXT = new Set([
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
  "feedlens"
]);

const X_POST_SELECTORS = "article[data-testid='tweet']";

const X_REMOVE_SELECTORS = [
  ".feedlens-marker",
  ".feedlens-detail",
  ".feedlens-status",
  "article[data-testid='tweet'] article[data-testid='tweet']",
  "[data-testid='reply']",
  "[data-testid='retweet']",
  "[data-testid='like']",
  "[data-testid='bookmark']",
  "[data-testid='share']",
  "[data-testid='caret']",
  "[data-testid='analytics']",
  "[role='group']",
  "[role='button']",
  "[role='menu']",
  "[role='menuitem']",
  "button",
  "input",
  "textarea",
  "select",
  "svg",
  "img",
  "video"
].join(",");

const X_UI_TEXT = new Set([
  "reply",
  "repost",
  "quote",
  "like",
  "bookmark",
  "share",
  "view",
  "views",
  "show more",
  "read more",
  "translate post",
  "feedlens"
]);

const X_RESERVED_PROFILE_PATHS = new Set([
  "account",
  "bookmarks",
  "compose",
  "communities",
  "explore",
  "help",
  "home",
  "i",
  "jobs",
  "lists",
  "login",
  "logout",
  "messages",
  "notifications",
  "premium",
  "privacy",
  "search",
  "settings",
  "share",
  "tos"
]);

const LINKEDIN_ADAPTER: PlatformAdapter = {
  id: "linkedin",
  label: "LinkedIn",
  postSelectors: LINKEDIN_POST_SELECTORS,
  matchesLocation: (location) =>
    location.hostname === "www.linkedin.com" || location.hostname.endsWith(".linkedin.com"),
  isSupportedPath: () => true,
  extractPostText: (element) =>
    extractPostTextFromClone(element, LINKEDIN_REMOVE_SELECTORS, isLinkedInUiLine),
  extractPostId: extractLinkedInPostId,
  extractAuthor: extractLinkedInAuthor,
  extractPostUrl: extractLinkedInPostUrl
};

const X_ADAPTER: PlatformAdapter = {
  id: "x",
  label: "X",
  postSelectors: X_POST_SELECTORS,
  matchesLocation: (location) => location.hostname === "x.com",
  isSupportedPath: isXSupportedPath,
  extractPostText: extractXPostText,
  extractPostId: extractXPostId,
  extractAuthor: extractXAuthor,
  extractPostUrl: extractXPostUrl
};

const PLATFORM_ADAPTERS = [LINKEDIN_ADAPTER, X_ADAPTER] as const;

export interface ExtractVisiblePostsOptions {
  root?: ParentNode;
  minTextLength?: number;
  maxPosts?: number;
  lookaheadPixels?: number;
  now?: Date;
  platform?: PlatformAdapter | SupportedPlatformId;
}

export async function getVisiblePosts({
  root = document,
  minTextLength = 50,
  maxPosts = 12,
  now = new Date(),
  platform
}: ExtractVisiblePostsOptions = {}): Promise<ExtractedPost[]> {
  const entries = await getVisiblePostEntries({ root, minTextLength, maxPosts, now, platform });
  return entries.map((entry) => entry.post);
}

export async function getVisiblePostEntries({
  root = document,
  minTextLength = 50,
  maxPosts = 12,
  lookaheadPixels = 0,
  now = new Date(),
  platform
}: ExtractVisiblePostsOptions = {}): Promise<Array<{ element: HTMLElement; post: ExtractedPost }>> {
  const adapter = resolvePlatformAdapter(platform) ?? LINKEDIN_ADAPTER;
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(adapter.postSelectors))
    .filter((element) => !hasAncestorPost(element, adapter))
    .filter((element) => isVisiblePost(element, lookaheadPixels));

  const entries: Array<{ element: HTMLElement; post: ExtractedPost }> = [];
  const seen = new Set<string>();

  for (const element of candidates) {
    const text = adapter.extractPostText(element);
    if (text.length < minTextLength) {
      continue;
    }

    const hash = await createPostHash(text, adapter.id);
    if (seen.has(hash)) {
      continue;
    }

    seen.add(hash);
    entries.push({
      element,
      post: {
        platform: adapter.id,
        postId: adapter.extractPostId(element, hash),
        hash,
        text,
        author: adapter.extractAuthor(element),
        url: adapter.extractPostUrl(element),
        detectedAt: now.toISOString()
      }
    });

    if (entries.length >= maxPosts) {
      break;
    }
  }

  return entries;
}

export function getCurrentPlatformAdapter(
  currentLocation: LocationLike = window.location
): PlatformAdapter | undefined {
  return PLATFORM_ADAPTERS.find((adapter) => adapter.matchesLocation(currentLocation));
}

export function getPlatformAdapter(platform: SupportedPlatformId): PlatformAdapter {
  return PLATFORM_ADAPTERS.find((adapter) => adapter.id === platform) ?? LINKEDIN_ADAPTER;
}

export function isSupportedPlatformPage(
  adapter: PlatformAdapter,
  currentLocation: LocationLike = window.location
): boolean {
  return adapter.isSupportedPath(currentLocation);
}

export function extractPostText(
  element: HTMLElement,
  platform: SupportedPlatformId = "linkedin"
): string {
  return getPlatformAdapter(platform).extractPostText(element);
}

export function isVisiblePost(element: HTMLElement, lookaheadPixels = 0): boolean {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const style = window.getComputedStyle(element);
  const viewportBottom = viewportHeight + Math.max(0, lookaheadPixels);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < viewportBottom &&
    rect.left < viewportWidth &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

export function extractPostId(
  element: HTMLElement,
  fallbackHash: string,
  platform: SupportedPlatformId = "linkedin"
): string {
  return getPlatformAdapter(platform).extractPostId(element, fallbackHash);
}

function resolvePlatformAdapter(
  platform: PlatformAdapter | SupportedPlatformId | undefined
): PlatformAdapter | undefined {
  return typeof platform === "string" ? getPlatformAdapter(platform) : platform ?? getCurrentPlatformAdapter();
}

function extractPostTextFromClone(
  element: HTMLElement,
  removeSelectors: string,
  isUiLine: (line: string) => boolean
): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(removeSelectors).forEach((node) => node.remove());
  return cleanPostText(getElementText(clone), isUiLine);
}

function extractXPostText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(X_REMOVE_SELECTORS).forEach((node) => node.remove());

  const primaryText = Array.from(clone.querySelectorAll<HTMLElement>("[data-testid='tweetText']"))
    .map(getElementText)
    .join("\n");

  return cleanPostText(primaryText || getElementText(clone), isXUiLine);
}

function cleanPostText(rawText: string, isUiLine: (line: string) => boolean): string {
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

function extractLinkedInPostId(element: HTMLElement, fallbackHash: string): string {
  const directId =
    element.getAttribute("data-urn") ??
    element.getAttribute("data-id") ??
    element.querySelector<HTMLElement>("[data-urn]")?.getAttribute("data-urn") ??
    element.querySelector<HTMLElement>("[data-id]")?.getAttribute("data-id");

  return directId?.trim() || `feedlens:linkedin:${fallbackHash.slice(0, 16)}`;
}

function extractXPostId(element: HTMLElement, fallbackHash: string): string {
  const url = extractXPostUrl(element);
  const statusId = url?.match(/\/status\/(\d+)/)?.[1];
  return statusId ? `x:status:${statusId}` : `feedlens:x:${fallbackHash.slice(0, 16)}`;
}

function extractLinkedInAuthor(element: HTMLElement): string | undefined {
  for (const selector of LINKEDIN_AUTHOR_SELECTORS) {
    const author = element.querySelector<HTMLElement>(selector);
    const text = author ? cleanLine(getElementText(author)) : "";
    if (text && !isLinkedInUiLine(text)) {
      return text.slice(0, 120);
    }
  }

  return undefined;
}

function extractXAuthor(element: HTMLElement): string | undefined {
  const nameBlock = element.querySelector<HTMLElement>("[data-testid='User-Name']");
  if (!nameBlock) {
    return undefined;
  }

  const candidates = Array.from(nameBlock.querySelectorAll<HTMLElement>("span"))
    .map((span) => cleanLine(getElementText(span)))
    .filter(Boolean)
    .filter((text) => !text.startsWith("@"))
    .filter((text) => text !== "·")
    .filter((text) => !/^\d+[smhd]$/.test(text.toLowerCase()))
    .filter((text) => !isXUiLine(text));

  return candidates[0]?.slice(0, 120);
}

function extractLinkedInPostUrl(element: HTMLElement): string | undefined {
  const link = element.querySelector<HTMLAnchorElement>(
    "a[href*='/feed/update/'], a[href*='urn:li:activity']"
  );

  return normalizeUrl(link?.href);
}

function extractXPostUrl(element: HTMLElement): string | undefined {
  const links = Array.from(element.querySelectorAll<HTMLAnchorElement>("a[href*='/status/']"));
  const link = links.find((candidate) => {
    try {
      return /\/[^/]+\/status\/\d+/.test(new URL(candidate.href, window.location.href).pathname);
    } catch {
      return false;
    }
  });

  return normalizeUrl(link?.href);
}

function hasAncestorPost(element: HTMLElement, adapter: PlatformAdapter): boolean {
  const parentPost = element.parentElement?.closest(adapter.postSelectors);
  return Boolean(parentPost);
}

function isXSupportedPath(location: LocationLike): boolean {
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/home") {
    return true;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) {
    return false;
  }

  const handle = segments[0];
  if (!handle) {
    return false;
  }

  return /^[A-Za-z0-9_]{1,15}$/.test(handle) && !X_RESERVED_PROFILE_PATHS.has(handle.toLowerCase());
}

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return undefined;
  }
}

function getElementText(element: HTMLElement): string {
  return "innerText" in element && typeof element.innerText === "string"
    ? element.innerText
    : (element.textContent ?? "");
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function isLinkedInUiLine(line: string): boolean {
  const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    LINKEDIN_UI_TEXT.has(normalized) ||
    /^\d+(\.\d+)?[kKmM]?\s*(reactions?|comments?|reposts?)$/.test(normalized) ||
    /^(\d+\s*)?(like|comment|repost|send)$/.test(normalized)
  );
}

function isXUiLine(line: string): boolean {
  const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    X_UI_TEXT.has(normalized) ||
    /^\d+(\.\d+)?[kKmM]?$/.test(normalized) ||
    /^\d+(\.\d+)?[kKmM]?\s*(replies|reposts|quotes|likes|views|bookmarks)$/.test(normalized) ||
    /^(\d+\s*)?(reply|repost|quote|like|bookmark|share)$/.test(normalized)
  );
}
