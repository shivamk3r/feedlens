# Testing and Release Checklist

## Automated Checks

Run the full local verification suite:

```sh
npm run verify
```

This runs:

1. `npm run typecheck`
2. `npm run test`
3. `npm run build`

For changes to the development-only debug log page, also run:

```sh
npm run build:dev
```

For local browser debugging that needs the in-extension Debug logs page, generate `dist/` with:

```sh
npm run build:dev
```

For GitHub release packaging, rebuild `dist/` with:

```sh
npm run build
```

Never package or attach a debug-mode `dist/` to a GitHub release.

Additional repository checks before committing or release:

```sh
git diff --check
find . -maxdepth 2 -type l -print -exec readlink {} \;
git status --short
```

The symlink check should continue to show tool adapters pointing at shared `.agents` assets:

```text
.claude/skills -> ../.agents/skills
.claude/commands -> ../.agents/commands
.cursor/skills -> ../.agents/skills
.cursor/commands -> ../.agents/commands
.codex/skills -> ../.agents/skills
CLAUDE.md -> AGENTS.md
```

Before creating or uploading a GitHub release ZIP, confirm the production `dist/` does not contain debug-only assets:

```sh
test ! -e dist/debug.html && test ! -e dist/assets/debug.js
```

## Manual Local Developer Beta Test

1. Run `npm run build:dev` for local browser debugging, or `npm run build` for release-like validation.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked extension from `dist/`.
5. Open FeedLens settings.
6. Enter a Gemini API key.
7. Accept the privacy notice.
8. Open `https://www.linkedin.com/feed/`.
9. Open the FeedLens popup and click Analyze visible.
10. Confirm visible posts receive calm green/yellow/red markers.
11. Click the Lens marker and confirm inline details open with scores, signals, counter-reading, and suggested action.
12. Pause FeedLens from the popup and confirm no new automatic analysis runs.
13. Clear markers from the popup.

Repeat the visible-post flow on:

- `https://x.com/home`
- one X profile timeline such as `https://x.com/{handle}`

Confirm unsupported X routes such as search, messages, notifications, and individual post detail pages do not auto-analyze and show an unsupported-page state in the popup.

## Privacy/Security Manual Checks

- Do not inspect or print `.env`.
- Confirm `dist/` does not contain `GEMINI_API_KEY` values.
- In development builds, confirm debug logs do not contain raw post text, API keys, Gemini request/response bodies, authors, URLs, snippets, summaries, or evidence quotes.
- Confirm `README.md`, `PRIVACY.md`, and `DISCLAIMER.md` frame installation as local developer testing, not Chrome Web Store publication.
- Confirm content script requests analysis through the background worker.
- Confirm content script code does not read `chrome.storage` keys directly.
- Confirm local cache entries are keyed by hash/model/prompt version and do not store full raw post text.
- Confirm Gemini keys are stored only in `chrome.storage.local`.
- Confirm inline details do not expose raw post text beyond short evidence already returned by the analysis result.

## Known MVP Limits

- LinkedIn and X DOM selectors may need maintenance as platform markup changes.
- Per-post copy, feedback, hide, and re-analysis controls are not part of the current inline-only MVP.
- Results are model assessments, not definitive fact checks.
- No provider other than Gemini is implemented.
