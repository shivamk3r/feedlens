import { DEFAULT_SETTINGS, PRIVACY_NOTICE_VERSION } from "./defaults";
import type {
  ApiKeyHealth,
  AnalysisCacheEntry,
  FeedLensSettings,
  SessionResult,
  SetupStatus
} from "./types";

const SETTINGS_KEY = "feedlens.settings.v1";
const LOCAL_API_KEY = "feedlens.geminiApiKey.local.v1";
const SESSION_API_KEY = "feedlens.geminiApiKey.session.v1";
const API_KEY_HEALTH_KEY = "feedlens.geminiApiHealth.local.v1";
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

export async function getApiKey(_settings = DEFAULT_SETTINGS): Promise<string | undefined> {
  const stored = await chrome.storage.local.get(LOCAL_API_KEY);
  const value = stored[LOCAL_API_KEY];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function hasApiKey(settings = DEFAULT_SETTINGS): Promise<boolean> {
  return Boolean(await getApiKey(settings));
}

export async function saveApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await clearApiKey();
    return;
  }

  await chrome.storage.local.set({ [LOCAL_API_KEY]: trimmed });
  await chrome.storage.local.remove(API_KEY_HEALTH_KEY);
  await chrome.storage.session.remove(SESSION_API_KEY);
}

export async function clearApiKey(): Promise<void> {
  await Promise.all([
    chrome.storage.local.remove(LOCAL_API_KEY),
    chrome.storage.local.remove(API_KEY_HEALTH_KEY),
    chrome.storage.session.remove(SESSION_API_KEY)
  ]);
}

export async function getApiKeyHealth(): Promise<ApiKeyHealth | undefined> {
  const stored = await chrome.storage.local.get(API_KEY_HEALTH_KEY);
  const health = stored[API_KEY_HEALTH_KEY];
  if (!isRecord(health)) {
    return undefined;
  }

  return health.status === "valid" &&
    typeof health.checkedAt === "string" &&
    typeof health.model === "string"
    ? {
        status: "valid",
        checkedAt: health.checkedAt,
        model: health.model
      }
    : undefined;
}

export async function saveApiKeyHealth(health: ApiKeyHealth): Promise<void> {
  await chrome.storage.local.set({ [API_KEY_HEALTH_KEY]: health });
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
  const storedPrivacyNoticeVersion = numberOr(record.privacyNoticeVersion, 0);
  const privacyAccepted =
    booleanOr(record.privacyAccepted, DEFAULT_SETTINGS.privacyAccepted) &&
    storedPrivacyNoticeVersion >= PRIVACY_NOTICE_VERSION;

  return {
    enabled: booleanOr(record.enabled, DEFAULT_SETTINGS.enabled),
    backgroundAnalysis: DEFAULT_SETTINGS.backgroundAnalysis,
    privacyAccepted,
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    storageMode: DEFAULT_SETTINGS.storageMode,
    model: DEFAULT_SETTINGS.model,
    temperature: DEFAULT_SETTINGS.temperature,
    maxOutputTokens: DEFAULT_SETTINGS.maxOutputTokens,
    analysisDepth: DEFAULT_SETTINGS.analysisDepth,
    storeCache: DEFAULT_SETTINGS.storeCache,
    highlightIntensity: DEFAULT_SETTINGS.highlightIntensity,
    sensitivity: DEFAULT_SETTINGS.sensitivity,
    uiMode: DEFAULT_SETTINGS.uiMode,
    maxVisiblePostsPerRun: DEFAULT_SETTINGS.maxVisiblePostsPerRun
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

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
