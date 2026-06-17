import {
  Check,
  Copy,
  EyeOff,
  KeyRound,
  PanelRightOpen,
  Pause,
  Play,
  RefreshCcw,
  Save,
  Settings,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  createIcons
} from "lucide";

const icons = {
  Check,
  Copy,
  EyeOff,
  KeyRound,
  PanelRightOpen,
  Pause,
  Play,
  RefreshCcw,
  Save,
  Settings,
  ThumbsDown,
  ThumbsUp,
  Trash2
};

export function hydrateIcons(root: Element | Document = document): void {
  createIcons({
    icons,
    root,
    attrs: {
      "aria-hidden": "true",
      "stroke-width": "2"
    }
  });
}
