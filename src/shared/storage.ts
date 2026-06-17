import { DEFAULT_SETTINGS } from "./defaults";
import type {
  AnalysisCacheEntry,
  FeedLensSettings,
  SessionResult,
  SetupStatus
} from "./types";

const SETTINGS_KEY = "feedlens.settings.v1";
const LOCAL_API_KEY = "feedlens.geminiApiKey.local.v1";
const SESSION_API_KEY = "feedlens.geminiApiKey.session.v1";
const CACHE_KEY = "feedlens.analysisCache.v1";
const SESSION_RESULTS_KEY = "feedlens.sessionResults.v1";
const SELECTED_HASH_KEY = "feedlens.selectedHash.v1";
const MAX_CACHE_ENTRIES = 250;
const MAX_SESSION_RESULTS = 80;

type StorageArea = chrome.storage.StorageArea;

export async function getSettings(): Promise<FeedLensSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

export async function saveSettings(patch: Partial<FeedLensSettings>): Promise<FeedLensSettings> {
  const settings = normalizeSettings({ ...(await getSettings()), ...patch });
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

export async function getApiKey(settings = DEFAULT_SETTINGS): Promise<string | undefined> {
  const area = getKeyArea(settings.storageMode);
  const keyName = settings.storageMode === "local" ? LOCAL_API_KEY : SESSION_API_KEY;
  const stored = await area.get(keyName);
  const value = stored[keyName];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function hasApiKey(settings = DEFAULT_SETTINGS): Promise<boolean> {
  return Boolean(await getApiKey(settings));
}

export async function saveApiKey(apiKey: string, storageMode: FeedLensSettings["storageMode"]): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await clearApiKey();
    return;
  }

  if (storageMode === "local") {
    await chrome.storage.local.set({ [LOCAL_API_KEY]: trimmed });
    await chrome.storage.session.remove(SESSION_API_KEY);
    return;
  }

  await chrome.storage.session.set({ [SESSION_API_KEY]: trimmed });
  await chrome.storage.local.remove(LOCAL_API_KEY);
}

export async function clearApiKey(): Promise<void> {
  await Promise.all([
    chrome.storage.local.remove(LOCAL_API_KEY),
    chrome.storage.session.remove(SESSION_API_KEY)
  ]);
}

export async function getCacheEntry(cacheKey: string): Promise<AnalysisCacheEntry | undefined> {
  const cache = await getCache();
  return cache[cacheKey];
}

export async function putCacheEntry(entry: AnalysisCacheEntry): Promise<void> {
  const cache = await getCache();
  cache[entry.cacheKey] = entry;

  const pruned = Object.fromEntries(
    Object.entries(cache)
      .sort(([, a], [, b]) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, MAX_CACHE_ENTRIES)
  );

  await chrome.storage.local.set({ [CACHE_KEY]: pruned });
}

export async function clearCache(): Promise<void> {
  await chrome.storage.local.remove(CACHE_KEY);
}

export async function getCacheEntryCount(): Promise<number> {
  return Object.keys(await getCache()).length;
}

export async function putSessionResult(result: SessionResult): Promise<void> {
  const results = await getSessionResultsMap();
  results[result.hash] = result;

  const pruned = Object.fromEntries(
    Object.entries(results)
      .sort(([, a], [, b]) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, MAX_SESSION_RESULTS)
  );

  await chrome.storage.session.set({ [SESSION_RESULTS_KEY]: pruned });
}

export async function getSessionResults(): Promise<SessionResult[]> {
  return Object.values(await getSessionResultsMap())
    .filter((result) => !result.hidden)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function hideSessionResult(hash: string): Promise<void> {
  const results = await getSessionResultsMap();
  if (results[hash]) {
    results[hash] = { ...results[hash], hidden: true };
    await chrome.storage.session.set({ [SESSION_RESULTS_KEY]: results });
  }
}

export async function setSessionResultFeedback(
  hash: string,
  feedback: SessionResult["feedback"]
): Promise<void> {
  const results = await getSessionResultsMap();
  if (results[hash]) {
    results[hash] = { ...results[hash], feedback };
    await chrome.storage.session.set({ [SESSION_RESULTS_KEY]: results });
  }
}

export async function selectResult(hash: string): Promise<void> {
  await chrome.storage.session.set({ [SELECTED_HASH_KEY]: hash });
}

export async function getSelectedHash(): Promise<string | undefined> {
  const stored = await chrome.storage.session.get(SELECTED_HASH_KEY);
  const selected = stored[SELECTED_HASH_KEY];
  return typeof selected === "string" ? selected : undefined;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const settings = await getSettings();
  const [apiKeyExists, cacheEntryCount, sessionResultCount, selectedHash] = await Promise.all([
    hasApiKey(settings),
    getCacheEntryCount(),
    getSessionResults().then((results) => results.length),
    getSelectedHash()
  ]);

  return {
    settings,
    hasApiKey: apiKeyExists,
    cacheEntryCount,
    sessionResultCount,
    selectedHash
  };
}

export function normalizeSettings(value: unknown): FeedLensSettings {
  const record = isRecord(value) ? value : {};

  return {
    enabled: booleanOr(record.enabled, DEFAULT_SETTINGS.enabled),
    backgroundAnalysis: booleanOr(record.backgroundAnalysis, DEFAULT_SETTINGS.backgroundAnalysis),
    privacyAccepted: booleanOr(record.privacyAccepted, DEFAULT_SETTINGS.privacyAccepted),
    storageMode: oneOf(record.storageMode, ["session", "local"], DEFAULT_SETTINGS.storageMode),
    model: stringOr(record.model, DEFAULT_SETTINGS.model),
    temperature: numberInRange(record.temperature, 0, 2, DEFAULT_SETTINGS.temperature),
    maxOutputTokens: integerInRange(
      record.maxOutputTokens,
      512,
      4096,
      DEFAULT_SETTINGS.maxOutputTokens
    ),
    analysisDepth: oneOf(
      record.analysisDepth,
      ["fast", "balanced", "deep"],
      DEFAULT_SETTINGS.analysisDepth
    ),
    storeCache: booleanOr(record.storeCache, DEFAULT_SETTINGS.storeCache),
    highlightIntensity: oneOf(
      record.highlightIntensity,
      ["subtle", "standard", "strong"],
      DEFAULT_SETTINGS.highlightIntensity
    ),
    sensitivity: oneOf(
      record.sensitivity,
      ["conservative", "balanced", "strict"],
      DEFAULT_SETTINGS.sensitivity
    ),
    uiMode: oneOf(
      record.uiMode,
      ["feed_highlights", "marker_only", "side_panel_only", "both"],
      DEFAULT_SETTINGS.uiMode
    ),
    maxVisiblePostsPerRun: integerInRange(
      record.maxVisiblePostsPerRun,
      1,
      20,
      DEFAULT_SETTINGS.maxVisiblePostsPerRun
    )
  };
}

async function getCache(): Promise<Record<string, AnalysisCacheEntry>> {
  return getRecordMap(chrome.storage.local, CACHE_KEY);
}

async function getSessionResultsMap(): Promise<Record<string, SessionResult>> {
  return getRecordMap(chrome.storage.session, SESSION_RESULTS_KEY);
}

async function getRecordMap<T>(area: StorageArea, key: string): Promise<Record<string, T>> {
  const stored = await area.get(key);
  const value = stored[key];
  return isRecord(value) ? (value as Record<string, T>) : {};
}

function getKeyArea(mode: FeedLensSettings["storageMode"]): StorageArea {
  return mode === "local" ? chrome.storage.local : chrome.storage.session;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function integerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(numberInRange(value, min, max, fallback));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
