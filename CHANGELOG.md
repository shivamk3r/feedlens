# Changelog

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
