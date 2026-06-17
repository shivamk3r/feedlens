# FeedLens

FeedLens is an open-source, privacy-first Chrome extension developer beta for surfacing information-quality and manipulation-risk signals on visible LinkedIn feed posts.

The MVP is Gemini-only. Users bring their own Gemini API key, and FeedLens does not run a backend server or store LinkedIn feed data on creator-controlled infrastructure.

## Current Status

This repository contains a loadable Manifest V3 Chrome extension for local developer testing. FeedLens is not published on the Chrome Web Store and is not affiliated with, endorsed by, or approved by LinkedIn, Google, Gemini, Chrome, or the Chrome Web Store.

The current developer beta includes:

- LinkedIn content script for visible-post detection, hashing, and inline markers.
- Background service worker that owns Gemini calls and never exposes API keys to page scripts.
- Popup controls for status, pause/resume, manual analysis, marker clearing, settings, and side panel access.
- Options page for Gemini key setup and privacy notice acceptance.
- Side panel for session-local analysis details, scores, signals, copy, hide, feedback, and re-analysis.
- Local-only analysis cache and session-only result list.
- TypeScript build, typecheck, and test tooling.

Before installing or using FeedLens, review the [privacy policy](PRIVACY.md) and [disclaimer](DISCLAIMER.md), including the LinkedIn platform-risk notes.

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

Load `dist/` in Chrome for local developer testing:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this repository's `dist/` directory.
5. Open the FeedLens options page and enter your Gemini API key.
6. Accept the in-extension privacy notice before analyzing visible posts.

For local test tooling only, copy `.env-example` to `.env` and set `GEMINI_API_KEY`. Do not commit `.env`, print real keys, or bundle `.env` values into extension assets.

## Documentation

- [Product specification](docs/product-specification.md)
- [Architecture](docs/architecture.md)
- [Testing and release checklist](docs/testing.md)
- [Privacy policy](PRIVACY.md)
- [Disclaimer](DISCLAIMER.md)
- [MIT license](LICENSE)

## Privacy Boundaries

- Gemini is the only implemented provider.
- Content scripts never read API keys.
- FeedLens sends visible post text directly from the user's browser to Gemini only after setup and privacy acceptance.
- Local cache stores analysis results, not full raw feed history. Analysis output may include short evidence quotes from visible post text.
- Session results may include a short post snippet for the side panel and are stored in `chrome.storage.session`.
- No analytics, backend server, or creator-side data collection is implemented.

## Platform Notice

FeedLens currently analyzes visible LinkedIn feed posts and adds local browser UI markers. LinkedIn may object to browser extensions that read LinkedIn page content, modify the appearance of LinkedIn pages, or interact with its website. Users should review LinkedIn's terms and policies before using FeedLens.
