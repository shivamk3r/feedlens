import type { SupportedPlatformId } from "./types";

export const PLATFORM_LABELS: Record<SupportedPlatformId, string> = {
  linkedin: "LinkedIn",
  x: "X"
};

export function platformLabel(platform: SupportedPlatformId | undefined): string {
  return platform ? PLATFORM_LABELS[platform] : "supported platform";
}
