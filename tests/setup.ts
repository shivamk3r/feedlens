import { vi } from "vitest";

vi.stubGlobal("chrome", {
  runtime: {
    openOptionsPage: vi.fn(),
    onInstalled: { addListener: vi.fn() }
  },
  sidePanel: {
    setPanelBehavior: vi.fn()
  },
  storage: {
    local: {},
    session: {}
  }
});
