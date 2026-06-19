# FeedLens

FeedLens is an open-source, privacy-first Chrome extension developer beta for surfacing information-quality and manipulation-risk signals on visible LinkedIn posts and X home/profile timeline posts.

The MVP is Gemini-only. Users bring their own Gemini API key, and FeedLens does not run a backend server or store feed data on creator-controlled infrastructure.

## Current Status

This repository contains a loadable Manifest V3 Chrome extension for local developer testing. FeedLens is not published on the Chrome Web Store and is not affiliated with, endorsed by, or approved by LinkedIn, X, Google, Gemini, Chrome, or the Chrome Web Store.

The current developer beta includes:

- Platform adapters for visible-post detection, hashing, and inline markers on LinkedIn and supported X timelines.
- Background service worker that owns Gemini calls and never exposes API keys to page scripts.
- Popup controls for status, pause/resume, manual analysis, marker clearing, settings, and side panel access.
- Options page for Gemini key setup and privacy notice acceptance.
- Side panel for session-local analysis details, scores, signals, copy, hide, feedback, and re-analysis.
- Local-only analysis cache and session-only result list.
- TypeScript build, typecheck, and test tooling.

Before installing or using FeedLens, review the [privacy policy](PRIVACY.md) and [disclaimer](DISCLAIMER.md), including the platform-risk notes.

## Getting Started

FeedLens release ZIPs are intended for local developer-beta testing with Chrome's unpacked-extension workflow. FeedLens is not distributed through the Chrome Web Store.

Install from a release ZIP:

1. Review the [privacy policy](PRIVACY.md) and [disclaimer](DISCLAIMER.md).
2. Open the [FeedLens releases page](https://github.com/shivamk3r/feedlens/releases).
3. Download the latest FeedLens extension ZIP from the release assets.
4. Unzip the archive.
5. Open `chrome://extensions`.
6. Enable Developer mode.
7. Choose Load unpacked.
8. Select the extracted extension folder. If the ZIP extracts to a folder that contains `dist/`, select that `dist/` folder.
9. Open the FeedLens options page.
10. Enter your Gemini API key and accept the in-extension privacy notice.
11. Open `https://www.linkedin.com/feed/`, `https://x.com/home`, or an X profile timeline and use the FeedLens popup to analyze visible posts.

Release ZIP installs do not require `npm install`, `.env`, or a local build. Unpacked extensions do not update automatically; repeat the release ZIP steps when you want to test a newer version.

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

Build the extension with the dev-only debug log page:

```sh
npm run build:dev
```

Load `dist/` in Chrome for local developer testing:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this repository's `dist/` directory.
5. Open the FeedLens options page and enter your Gemini API key.
6. Accept the in-extension privacy notice before analyzing visible posts on supported platforms.

When using a development build, the popup includes a Debug logs button. Debug logs are session-only and intentionally omit raw post text, API keys, Gemini request/response bodies, author names, URLs, snippets, summaries, and evidence quotes.

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

FeedLens currently analyzes visible LinkedIn posts and supported X home/profile timeline posts, then adds local browser UI markers. LinkedIn or X may object to browser extensions that read page content, modify page appearance, or interact with their websites. Users should review each platform's terms and policies before using FeedLens.
