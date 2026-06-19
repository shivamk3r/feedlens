import { vi } from "vitest";

type Listener<T extends (...args: never[]) => void> = T;

class MemoryStorageArea {
  readonly data: Record<string, unknown> = {};

  get = vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
    if (keys === undefined || keys === null) {
      return { ...this.data };
    }

    if (typeof keys === "string") {
      return { [keys]: this.data[keys] };
    }

    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, this.data[key]]));
    }

    return Object.fromEntries(
      Object.entries(keys).map(([key, fallback]) => [key, this.data[key] ?? fallback])
    );
  });

  set = vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(this.data, items);
  });

  remove = vi.fn(async (keys: string | string[]) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      delete this.data[key];
    }
  });

  clear = vi.fn(async () => {
    for (const key of Object.keys(this.data)) {
      delete this.data[key];
    }
  });
}

export interface ChromeMock {
  runtime: {
    getURL: ReturnType<typeof vi.fn>;
    openOptionsPage: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    onInstalled: { addListener: ReturnType<typeof vi.fn> };
    onMessage: { addListener: ReturnType<typeof vi.fn> };
  };
  sidePanel: {
    setPanelBehavior: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
  };
  storage: {
    local: MemoryStorageArea;
    session: MemoryStorageArea;
    onChanged: { addListener: ReturnType<typeof vi.fn> };
  };
  tabs: {
    create: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  };
}

export function createChromeMock(): ChromeMock {
  return {
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://feedlens/${path}`),
      openOptionsPage: vi.fn(async () => undefined),
      sendMessage: vi.fn(async () => undefined),
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() }
    },
    sidePanel: {
      setPanelBehavior: vi.fn(async () => undefined),
      open: vi.fn(async () => undefined)
    },
    storage: {
      local: new MemoryStorageArea(),
      session: new MemoryStorageArea(),
      onChanged: { addListener: vi.fn() }
    },
    tabs: {
      create: vi.fn(async () => undefined),
      query: vi.fn(async () => [{ id: 1, windowId: 1, url: "https://www.linkedin.com/feed/" }]),
      sendMessage: vi.fn(async () => undefined)
    }
  };
}

export function resetChromeMock(): ChromeMock {
  const chromeMock = createChromeMock();
  vi.stubGlobal("chrome", chromeMock);
  return chromeMock;
}

export function getChromeMock(): ChromeMock {
  return globalThis.chrome as unknown as ChromeMock;
}

export type AnyListener = Listener<(...args: never[]) => void>;
