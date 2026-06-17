# Changelog

## v0.1.1 - Developer Beta Readiness

FeedLens v0.1.1 updates the public developer-beta packaging and documentation after the v0.1.0 MVP release. Runtime analysis behavior remains Gemini-only and local-first.

### Changed

- Renamed the product from `Feed Lens` to `FeedLens` across extension UI, manifest metadata, prompts, tests, and documentation.
- Updated package metadata from `feed-lens` to `feedlens`.
- Updated the prompt/cache version identifier from `feed-lens-v1` to `feedlens-v1`, so existing local analysis cache entries from v0.1.0 may be refreshed.

### Added

- Added MIT license, privacy policy, and disclaimer documents for the GitHub-only developer beta.
- Added README guidance for installing FeedLens from release ZIP assets using Chrome's unpacked-extension workflow.
- Added clearer local developer-beta framing and LinkedIn platform-risk notes.

### Notes

- FeedLens is still not published on the Chrome Web Store.
- Gemini remains the only supported provider.
- Users still bring their own Gemini API key and must accept the privacy notice before analysis runs.

## v0.1.0 - MVP Release

FeedLens v0.1.0 is the first loadable developer-beta release of the privacy-first Chrome extension for LinkedIn feed analysis.

### Added

- LinkedIn visible-post detection for current feed layouts, including LinkedIn SDUI `mainFeed` list items and legacy feed containers.
- Gemini-only analysis flow with structured response validation and settings-page API key health checks before saving.
- Privacy-first data handling with local Gemini key storage, local analysis cache keyed by hash/model/prompt version, and session-only result details.
- Popup controls for pause/resume, manual visible-post analysis, marker clearing, settings, and side panel access.
- Options page for Gemini setup and privacy notice acceptance.
- Side panel for session-local analysis details, copy, hide, feedback, and re-analysis of known posts.
- Automated TypeScript, unit test, manifest, storage, extraction, and Gemini request validation coverage.

### Known MVP Limits

- LinkedIn DOM selectors may need maintenance as LinkedIn changes markup.
- Side panel re-analysis works only for posts still known to the active content script.
- Results are model assessments, not definitive fact checks.
- Gemini is the only supported provider in this release.
- Chrome Web Store publication is not part of this release; build locally and load `dist/` as an unpacked extension for developer testing.
