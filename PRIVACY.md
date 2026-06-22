# Privacy Policy

FeedLens is a local-first Chrome extension for analyzing visible LinkedIn posts and supported X timeline posts with a user-provided Gemini API key.

## Summary

FeedLens does not run a backend server, does not use analytics, does not sell data, and does not collect extension user data on creator-controlled infrastructure.

The project creator does not collect:

- Gemini API keys
- LinkedIn or X posts
- LinkedIn or X profile data
- browsing history
- analysis results
- user identities

## Data FeedLens Handles

FeedLens may handle the following data in the user's browser:

- visible LinkedIn post text and supported X timeline post text
- limited visible post metadata, such as author display name and post URL, when needed for local UI context
- the user's Gemini API key
- FeedLens settings, including privacy notice acceptance
- local analysis cache entries
- session-only extension state

FeedLens uses this data only to provide the user-facing extension features: detecting visible supported-platform posts, sending selected post text to Gemini with the user's API key after consent, showing information-quality and manipulation-risk signals, and reducing duplicate analysis through local caching.

## Local Storage

FeedLens stores the Gemini API key in Chrome extension storage on the user's device. The key is read by the extension background service worker and is not exposed to platform page scripts.

FeedLens may store local settings and a local analysis cache in `chrome.storage.local`. The cache stores analysis output keyed by a hash/model/prompt version. It does not store a full raw feed history, but analysis output may include short evidence quotes generated from visible post text.

FeedLens may store session-only runtime state in `chrome.storage.session`. Session state may include detected-post counts, status information, or sanitized debug metadata in development builds. Debug metadata is designed to omit raw post text, API keys, Gemini request or response bodies, authors, URLs, snippets, summaries, and evidence quotes.

Users can clear the saved Gemini API key from the FeedLens settings page. Users can clear visible markers and local analysis cache from the extension popup.

## Gemini Data Transfer

After the user configures a Gemini API key and accepts the in-extension privacy notice, FeedLens may send visible LinkedIn post text or supported X timeline post text directly from the user's browser to the Gemini API using the user's API key.

FeedLens does not proxy Gemini requests through a creator-controlled server. The user's use of Gemini is subject to Google's and Gemini's applicable privacy policies, API terms, billing terms, retention practices, abuse-monitoring practices, and review practices.

Users should avoid analyzing sensitive, confidential, or private content unless they are comfortable with the applicable Gemini terms for their account and API usage.

## Data Sharing

FeedLens does not sell user data, use user data for advertising, or share user data with the project creator. The only external transfer performed by the extension is the user-initiated or consented transfer of visible post text from the user's browser to Gemini for analysis, using the user's own Gemini API key.

## Security

FeedLens sends Gemini requests over HTTPS. API keys are stored locally in Chrome extension storage and are sent to Gemini in the `x-goog-api-key` request header, not in the request URL.

Content scripts never read API keys. The extension does not include remote code and does not execute remotely hosted scripts.

## Local Testing Keys

For local test tooling, developers may create a root `.env` file with `GEMINI_API_KEY`. The `.env` file is ignored by git and must not be committed, printed, logged, or bundled into extension assets.

## Contact

For privacy or security concerns, please open a GitHub issue or contact the repository maintainer through the public repository profile.
