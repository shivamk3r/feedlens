# Feed Lens

Feed Lens is a privacy-first Chrome extension for surfacing information-quality and manipulation-risk signals on visible LinkedIn feed posts.

The MVP is Gemini-only. Users bring their own Gemini API key, and Feed Lens does not run a backend server or store LinkedIn feed data on creator-controlled infrastructure.

## Current Status

This repository now contains a loadable Manifest V3 Chrome extension with:

- LinkedIn content script for visible-post detection, hashing, and inline markers.
- Background service worker that owns Gemini calls and never exposes API keys to page scripts.
- Popup controls for status, pause/resume, manual analysis, marker clearing, settings, and side panel access.
- Options page for Gemini key setup, privacy notice acceptance, model/tuning controls, cache, and display preferences.
- Side panel for session-local analysis details, scores, signals, copy, hide, feedback, and re-analysis.
- Local-only analysis cache and session-only result list.
- TypeScript build, typecheck, and test tooling.

## Local Development

Install dependencies:

```sh
npm install
```

Run verification:

```sh
npm run verify
```

Build the extension:

```sh
npm run build
```

Load `dist/` in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this repository's `dist/` directory.
5. Open the Feed Lens options page and enter your Gemini API key.

For local test tooling only, copy `.env-example` to `.env` and set `GEMINI_API_KEY`. Do not commit `.env`, print real keys, or bundle `.env` values into extension assets.

## Documentation

- [Product specification](docs/product-specification.md)
- [Architecture](docs/architecture.md)
- [Testing and release checklist](docs/testing.md)

## Privacy Boundaries

- Gemini is the only implemented provider.
- Content scripts never read API keys.
- Feed Lens sends visible post text directly from the user's browser to Gemini only after setup and privacy acceptance.
- Local cache stores analysis results, not raw post text.
- Session results may include a short post snippet for the side panel and are stored in `chrome.storage.session`.
- No analytics, backend server, or creator-side data collection is implemented.
