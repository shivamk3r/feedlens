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

## Manual Chrome Extension Test

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked extension from `dist/`.
5. Open Feed Lens settings.
6. Choose session-only key storage for first test.
7. Enter a Gemini API key.
8. Accept the privacy notice.
9. Open `https://www.linkedin.com/feed/`.
10. Open the Feed Lens popup and click Analyze visible.
11. Confirm visible posts receive calm green/yellow/red markers.
12. Click a marker and confirm the inline detail opens.
13. Open the side panel and confirm session results appear.
14. Test copy, hide, useful/not useful, and re-analyze.
15. Pause Feed Lens from the popup and confirm no new automatic analysis runs.
16. Clear markers from the popup and clear cache from settings.

## Privacy/Security Manual Checks

- Do not inspect or print `.env`.
- Confirm `dist/` does not contain `GEMINI_API_KEY` values.
- Confirm content script requests analysis through the background worker.
- Confirm content script code does not read `chrome.storage` keys directly.
- Confirm local cache entries are keyed by hash/model/prompt version and do not store full raw post text.
- Confirm the side panel result list is session-only.

## Known MVP Limits

- LinkedIn DOM selectors may need maintenance as LinkedIn changes markup.
- The side panel can re-analyze only posts still known to the active content script.
- Results are model assessments, not definitive fact checks.
- No provider other than Gemini is implemented.
