import {
  Bug,
  Check,
  Copy,
  KeyRound,
  Pause,
  Play,
  RefreshCcw,
  Save,
  Search,
  Settings,
  Trash2,
  createIcons
} from "lucide";

const icons = {
  Bug,
  Check,
  Copy,
  KeyRound,
  Pause,
  Play,
  RefreshCcw,
  Save,
  Search,
  Settings,
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
