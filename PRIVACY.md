# Privacy Policy

FeedLens is a local-first developer beta for analyzing visible LinkedIn posts and supported X timeline posts with a user-provided Gemini API key.

## What FeedLens Does Not Collect

FeedLens does not run a backend server, does not use analytics, and does not collect data on creator-controlled infrastructure.

The project creator does not collect:

- Gemini API keys
- LinkedIn or X posts
- LinkedIn or X profile data
- browsing history
- analysis results
- user identities

## Local Data Handling

FeedLens stores the Gemini API key in Chrome extension storage on the user's device. The key is read by the extension background service worker and is not exposed to platform page scripts.

FeedLens may store local settings and a local analysis cache in `chrome.storage.local`. The cache stores analysis output keyed by a hash/model/prompt version. It does not store a full raw feed history, but analysis output may include short evidence quotes generated from visible post text.

FeedLens may store session results in `chrome.storage.session` for the side panel. Session results may include a short post snippet, author display name, post URL, analysis result, feedback marker, and related metadata. These results are intended to last only for the browser session.

## Gemini Data Transfer

After the user configures a Gemini API key and accepts the in-extension privacy notice, FeedLens may send visible LinkedIn post text or supported X timeline post text directly from the user's browser to the Gemini API using the user's API key.

FeedLens does not proxy Gemini requests through a creator-controlled server. The user's use of Gemini is subject to Google's and Gemini's applicable privacy policies, API terms, billing terms, retention practices, abuse-monitoring practices, and review practices.

Users should avoid analyzing sensitive, confidential, or private content unless they are comfortable with the applicable Gemini terms for their account and API usage.

## Local Testing Keys

For local test tooling, developers may create a root `.env` file with `GEMINI_API_KEY`. The `.env` file is ignored by git and must not be committed, printed, logged, or bundled into extension assets.

## Contact

For privacy or security concerns, please open a GitHub issue or contact the repository maintainer through the public repository profile.
