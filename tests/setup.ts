import { beforeEach, vi } from "vitest";
import { resetChromeMock } from "./helpers/chrome";

beforeEach(() => {
  resetChromeMock();
  vi.unstubAllEnvs();
});
