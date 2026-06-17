# Feed Lens Product Specification

## 1. Product Overview

### Product Name

Fixed name: **Feed Lens**

### One-Line Description

Feed Lens is a privacy-first Chrome extension that works quietly behind the scenes to help users identify misinformation risk, manipulation, engagement-bait, psychological pressure, and high-quality information in LinkedIn feed posts using their own Gemini API key.

### Product Summary

Feed Lens analyzes posts visible in a user's LinkedIn feed and overlays subtle, color-coded guidance directly on the feed. Posts with high-quality information are marked green, ambiguous or mixed-quality posts are marked yellow, and posts with strong misinformation risk or manipulative pressure are marked red.

The extension does not require a user account, does not operate a backend server, does not store LinkedIn feed data, and does not pay for LLM usage. In the first version, users bring their own Gemini API key. Future versions may add other model providers or local model support, but they are out of scope for the initial implementation.

The product is not intended to censor content, block posts, or label people as manipulative. It helps users navigate their digital life with more awareness by making it clear when a post appears informative, uncertain, unsupported, emotionally pressuring, or potentially manipulative. Users can still consume any content they want, but Feed Lens helps them notice what kind of content they are consuming.

### Recommended Positioning

Feed Lens should be positioned as:

```text
A privacy-first digital information lens for LinkedIn.
```

Avoid positioning such as:

```text
A tool that detects manipulative people.
A tool that exposes fake gurus.
A tool that labels posts as propaganda.
```

Recommended public copy:

```text
Feed Lens helps you understand the quality and persuasive pressure of the information you consume on LinkedIn.

It subtly marks posts as green, yellow, or red based on signals like evidence quality, misinformation risk, urgency, fear framing, vague authority, social proof pressure, and engagement bait. It uses your own Gemini API key, and your feed does not pass through our servers.
```

## 2. Problem Statement

LinkedIn feeds often contain posts optimized for attention, virality, emotional reaction, professional insecurity, and engagement. Users may find it difficult to distinguish genuinely useful information from content that relies on misinformation risk, unsupported claims, psychological pressure, vague authority, fear of missing out, or performative storytelling.

Current platforms show engagement metrics, but they do not help users understand whether a post is informative, uncertain, misleading, or emotionally manipulative.

Users need a lightweight tool that helps them move through their digital life with more awareness, so they can see when they are consuming high-quality information, ambiguous claims, or manipulation-heavy content.

## 3. Target Users

### Primary Users

1. **Knowledge workers**
   - People who spend time on LinkedIn for career, hiring, networking, and industry updates.
   - They want to avoid misinformation and emotional manipulation in viral professional content.

2. **Founders and builders**
   - People who consume a lot of startup, AI, growth, and productivity content.
   - They want to detect hype, misinformation risk, urgency, and vague authority signals.

3. **Students and early-career professionals**
   - People who may be vulnerable to career anxiety, hustle-culture posts, and status-based messaging.

4. **Researchers, journalists, and creators**
   - People interested in studying online persuasion, manipulation, and information-quality patterns.

### Secondary Users

1. **Teams and organizations**
   - Could use Feed Lens later for media literacy training.
   - Not part of the MVP.

2. **Educators**
   - Could use Feed Lens to teach critical thinking.
   - Not part of the MVP.

## 4. Product Principles

1. **User privacy first**
   - No backend.
   - No user accounts.
   - No server-side logging.
   - No storage of LinkedIn feed data by the product creator.

2. **User-controlled AI**
   - Users provide their own Gemini API key.
   - Users control their Gemini usage, cost, and privacy tradeoffs.
   - Other model providers and local endpoints are future work, not first-version scope.

3. **Seamless but user-controlled**
   - Once configured, the extension can analyze visible feed posts quietly in the background.
   - Users can pause analysis, disable highlighting, clear results, or switch to manual-only behavior.
   - The extension does not analyze anything until the user configures Gemini access and accepts the privacy notice.

4. **Explain, do not judge**
   - The extension explains information-quality, misinformation-risk, and persuasion signals.
   - It avoids calling a person manipulative.
   - It analyzes the text, not the author's intent.

5. **No automation abuse**
   - No auto-scrolling.
   - No liking, commenting, connecting, messaging, or posting.
   - No scraping at scale.
   - Only analyze posts already visible to the user.

6. **Transparent scoring**
   - Every color label and score includes evidence.
   - Users can see why a post received a green, yellow, or red marker.

## 5. Goals and Non-Goals

### MVP Goals

1. Analyze visible LinkedIn feed posts after the user has configured the extension.
2. Detect misinformation-risk, manipulation, persuasion, and information-quality signals in each post.
3. Mark posts with subtle green, yellow, or red visual treatment.
4. Allow users to configure their own Gemini API key.
5. Avoid storing user data on external servers.
6. Provide inline feed markings plus a side panel or popover for details.
7. Work seamlessly behind the scenes while preserving user controls to pause, re-analyze, hide, or clear results.

### Long-Term Goals

1. Support multiple social platforms.
2. Support additional model providers and local models.
3. Improve scoring calibration over time.
4. Provide media literacy education.
5. Allow users to compare different styles of persuasion, manipulation, and misinformation.
6. Create an open-source rules and LLM hybrid classifier.

### Non-Goals for MVP

The MVP will not:

1. Store LinkedIn posts on a server.
2. Build a centralized dataset of LinkedIn content.
3. Auto-scroll through the LinkedIn feed.
4. Automatically engage with posts.
5. Rank authors or profiles.
6. Claim that a post author is intentionally manipulative.
7. Provide legal, psychological, or medical conclusions.
8. Replace human judgment.
9. Use the official LinkedIn API.
10. Require users to create an account.
11. Support non-Gemini providers or local model endpoints.

## 6. MVP User Flows

### First-Time Setup

1. User installs the Chrome extension.
2. User opens the extension settings page.
3. User enters their Gemini API key.
4. User accepts the privacy notice:

```text
Visible posts are analyzed using Gemini with your API key. Feed Lens does not operate a backend and does not store your data.
```

5. User opens the LinkedIn feed.
6. Extension starts analyzing visible posts in the background.
7. Extension marks posts with subtle green, yellow, or red treatment.
8. User can pause background analysis or switch to manual analysis from the popup.

### Normal Usage

1. User visits LinkedIn feed.
2. Extension detects posts as they become visible.
3. Extension extracts post text without auto-scrolling or engaging with the page.
4. Extension sends visible post text directly to the Gemini API using the user's configured key.
5. Extension receives structured analysis.
6. Extension displays a subtle feed marker:
   - Green for high-quality information and low manipulation risk.
   - Yellow for uncertain, mixed, or indecisive posts.
   - Red for high misinformation risk, strong manipulation, or content that pressures users through insecurity or shame.
7. User can click a marker to see:
   - Information-quality assessment
   - Misinformation-risk signals
   - Manipulation and persuasion signals
   - Short explanation
   - Highlighted evidence
   - Confidence level
   - Counter-reading

### Example Output

```text
Feed Lens: Red

Information Quality: Low
Misinformation Risk: High
Manipulation Pressure: Strong

Detected Signals:
- Unsupported strong claims
- Fear of missing out
- Status anxiety
- Vague authority
- Engagement bait

Why:
This post makes broad claims without evidence and creates urgency by implying the reader will fall behind unless they act immediately. It also uses vague phrases like "top performers know this" without giving specific support.

Confidence: Medium
```

## 7. MVP Feature Set

### Chrome Extension

Feed Lens will be delivered as a Chrome extension using Manifest V3.

Required components:

1. **Content script**
   - Runs on LinkedIn pages.
   - Detects visible post containers.
   - Extracts post text.
   - Renders subtle green, yellow, or red feed markings when enabled.
   - Does not access API keys.

2. **Background service worker**
   - Handles communication with the Gemini API.
   - Reads API key from extension storage.
   - Sends post text for analysis.
   - Handles Gemini API errors and invalid responses.
   - Returns structured results to the content script.

3. **Popup UI**
   - Shows current status.
   - Provides pause, resume, and re-analyze visible posts actions.
   - Shows number of detected posts.
   - Shows setup warnings and error states.

4. **Options/settings page**
   - Gemini API key input.
   - Privacy notice acceptance.
   - Clear key action.

5. **Optional side panel**
   - Displays analysis for selected posts.
   - Provides a detailed breakdown.
   - Supports copying, hiding, and re-analyzing results.

## 8. Permissions

The extension should request the minimum permissions needed.

Suggested permissions:

```json
{
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.linkedin.com/*"
  ]
}
```

For MVP, keep permissions narrow and limited to LinkedIn. Behind-the-scenes analysis should only run after the user configures Gemini access, accepts the privacy notice, and visits LinkedIn in their own browser session. Avoid broad browsing permissions and do not analyze non-LinkedIn pages unless support is explicitly added later.

## 9. Data Handling and Privacy

### Data Processed by the Extension

The extension may process:

1. Visible LinkedIn post text.
2. Post author display name, if needed for UI context.
3. Public engagement text visible in the post, if needed.
4. Feed Lens Gemini runtime settings.
5. User's Gemini API key.
6. Local analysis cache.

### Data Not Collected by the Product Creator

The product creator will not collect:

1. LinkedIn posts.
2. Profile data.
3. API keys.
4. Browsing history.
5. Analysis results.
6. User identity.
7. Analytics, unless explicitly added later with opt-in.

### Key Storage

The Gemini API key is stored locally in Chrome extension storage on the user's device. Feed Lens does not collect the key or send it to a creator-controlled backend.

### Local Testing Key

For local development and test tooling, copy `.env-example` to a root `.env` file and set:

```text
GEMINI_API_KEY=your-gemini-api-key
```

The `.env` file must remain local and must not be committed. Do not print or log the key. Do not compile the `.env` value into distributable Chrome extension assets.

### Privacy Notice

Suggested user-facing copy:

```text
Feed Lens analyzes visible LinkedIn posts using Gemini with the API key you configure.

We do not run a backend server.
We do not store your LinkedIn feed.
We do not collect your API key.
We do not sell or share your data.

When Feed Lens analyzes a visible post, the post text may be sent directly from your browser to the Gemini API. Your use of Gemini is subject to Google's privacy policy and billing terms.
```

## 10. LLM Provider Support

### MVP Providers

1. Gemini API only

### Deferred Providers

The first version should not implement these providers:

1. OpenAI API
2. Anthropic API
3. Ollama or local model
4. Custom OpenAI-compatible endpoint

### Runtime Configuration

The first customer-facing version should keep setup simple:

1. Users configure only their Gemini API key.
2. Users accept the privacy notice before analysis runs.
3. Feed Lens uses the fixed Gemini model `gemini-3.5-flash`.
4. Model tuning, analysis depth, sensitivity, storage mode, and cache behavior are internal defaults, not user-facing settings.

## 11. Classification and Scoring System

The product should avoid presenting any label as objective truth. Feed Lens should frame its output as an information-quality and manipulation-risk assessment, not as a definitive ruling about truth, intent, or character.

### Feed Marker Labels

```text
Green: High-quality information, low misinformation risk, and low manipulation pressure.
Yellow: Mixed, ambiguous, unsupported, or indecisive content that should be read carefully.
Red: High misinformation risk, strong manipulation pressure, or content that pressures users through insecurity, shame, urgency, or fear.
```

### Scores

Each post should receive separate scores so the UI can explain why a marker was chosen:

```text
information_quality_score: 0-100, where higher means more useful, specific, supported, and nuanced.
misinformation_risk_score: 0-100, where higher means more unsupported, misleading, unverifiable, or overconfident.
manipulation_pressure_score: 0-100, where higher means more psychological pressure or emotional steering.
overall_risk_score: 0-100, derived from misinformation risk and manipulation pressure.
```

### Marker Decision Rules

```text
Green:
- High information_quality_score
- Low misinformation_risk_score
- Low manipulation_pressure_score
- Clear evidence, nuance, or practical information

Yellow:
- Mixed evidence
- Unclear claims
- Moderate persuasion pressure
- The model is uncertain
- The post may be useful but should be read critically

Red:
- High misinformation_risk_score or high manipulation_pressure_score
- Unsupported strong claims
- Strong fear, shame, status anxiety, or urgency
- Content that makes readers feel bad about themselves in order to push action, engagement, or belief
```

### Signal Categories

Each post should be analyzed across these dimensions:

1. **Information quality**
   - Provides useful, specific, grounded, or actionable information.

2. **Missing evidence**
   - Makes strong claims without examples, data, or verifiable support.

3. **Misinformation risk**
   - Presents unsupported, misleading, unverifiable, or overconfident claims.
   - The product should flag risk rather than declare a claim false unless the post text itself clearly contradicts known context supplied to the model.

4. **Fear / threat framing**
   - Uses fear, risk, or loss to pressure the reader.

5. **Artificial urgency**
   - Pushes immediate action without a clear reason.

6. **Status anxiety**
   - Makes the reader feel behind, inferior, outdated, or unsuccessful.

7. **Self-worth pressure**
   - Suggests the reader's ambition, intelligence, seriousness, or value is at stake.

8. **Authority signaling**
   - Uses vague authority without evidence, such as "experts say" or "top 1% people know."

9. **Social proof pressure**
   - Implies something is true because many people believe it or because successful people do it.

10. **Engagement bait**
    - Asks users to comment, like, repost, or DM in a formulaic way.

11. **False binary**
    - Presents only two extreme options when more nuance exists.

12. **Overgeneralization**
    - Makes broad claims from limited evidence.

13. **Vague promise**
    - Promises transformation without concrete details.

14. **Emotional storytelling**
    - Uses a personal story in a way that may emotionally steer the reader toward a conclusion.

## 12. LLM Output Schema

The LLM should return structured JSON.

```json
{
  "marker": "red",
  "confidence": "medium",
  "information_quality_score": 28,
  "misinformation_risk_score": 76,
  "manipulation_pressure_score": 82,
  "overall_risk_score": 79,
  "summary": "This post makes broad unsupported claims and uses status anxiety to pressure the reader.",
  "signals": [
    {
      "type": "status_anxiety",
      "severity": "high",
      "evidence": "Most people will be left behind...",
      "explanation": "This phrase pressures the reader by implying they are falling behind professionally."
    },
    {
      "type": "missing_evidence",
      "severity": "high",
      "evidence": "Top performers all use this system...",
      "explanation": "The post makes a broad claim without showing evidence, examples, or a verifiable source."
    },
    {
      "type": "engagement_bait",
      "severity": "medium",
      "evidence": "Comment YES and I will send it to you.",
      "explanation": "This is a common engagement tactic designed to increase comments."
    }
  ],
  "counter_reading": "The post may be using motivational language and may contain some useful advice, but the claims are not well supported in the text.",
  "suggested_user_action": "Read critically, look for specific evidence, and avoid accepting the claim only because it creates urgency."
}
```

### Output Requirements

1. `marker` must be `green`, `yellow`, or `red`.
2. `confidence` must be `low`, `medium`, or `high`.
3. Score fields must be integers from 0 to 100.
4. `signals` must contain zero or more detected signal objects.
5. Every signal should include:
   - `type`
   - `severity`
   - `evidence`
   - `explanation`
6. Evidence should quote only the minimum relevant phrase from the post.
7. The response should include a fair counter-reading when appropriate.
8. The response should avoid claims about author intent.
9. Misinformation should be framed as risk unless the system has enough evidence to support a stronger conclusion.

## 13. Prompt Design

The model prompt should instruct the LLM to:

1. Analyze only the post text.
2. Avoid making claims about the author's intent.
3. Avoid defamatory language.
4. Identify information-quality, misinformation-risk, and manipulation signals with evidence.
5. Provide confidence level.
6. Explain uncertainty.
7. Return valid JSON.
8. Avoid political or ideological bias.
9. Distinguish persuasion from manipulation.
10. Avoid over-scoring harmless motivational content.
11. Avoid declaring something false unless there is enough evidence.

### Prompt Template

```text
You are analyzing a LinkedIn post for information quality, misinformation risk, and manipulation signals.

Do not judge the author.
Do not claim intent.
Analyze only the text.
Be careful, fair, and evidence-based.
If a claim may be misleading or unsupported, describe it as a risk unless there is enough evidence to say more.

Return JSON with:
- marker: green, yellow, or red
- confidence: low, medium, high
- information_quality_score from 0 to 100
- misinformation_risk_score from 0 to 100
- manipulation_pressure_score from 0 to 100
- overall_risk_score from 0 to 100
- summary
- detected signals
- evidence quotes
- explanations
- counter_reading
- suggested_user_action

Post text:
{{POST_TEXT}}
```

## 14. UX Requirements

### Inline Badge

Each analyzed post should receive a subtle marker. The visual treatment should be noticeable enough to guide attention but calm enough that it does not shame the author or make the feed feel hostile.

```text
Feed Lens: Green
Feed Lens: Yellow
Feed Lens: Red
```

On click, the marker should show details.

### Feed Highlighting

Suggested visual treatment:

1. **Green**
   - Use for high-quality information.
   - Indicates low manipulation pressure and low misinformation risk.
   - Should feel calm and affirmative.

2. **Yellow**
   - Use for mixed, uncertain, ambiguous, or indecisive posts.
   - Indicates the user should read carefully.
   - Should feel like a gentle caution state.

3. **Red**
   - Use for high misinformation risk, strong manipulation, or content that uses fear, shame, status anxiety, or self-worth pressure.
   - Should be slightly red and polished, not aggressive or alarmist.
   - Should indicate "be aware of what you are consuming" rather than "this author is bad."

### Side Panel

The side panel should show:

1. List of analyzed posts.
2. Green, yellow, or red marker for each post.
3. Information-quality score.
4. Misinformation-risk score.
5. Manipulation-pressure score.
6. Signal categories.
7. Explanation.
8. Confidence.
9. Button to re-analyze.
10. Button to copy analysis.
11. Button to hide result.
12. Button to mark the result as useful or not useful locally.

### Color and Severity Labels

Suggested labels:

```text
High-quality
Mixed / uncertain
High risk
Low manipulation pressure
Moderate manipulation pressure
Strong manipulation pressure
```

Avoid alarming labels:

```text
Dangerous
Brainwashing
Propaganda
Manipulative person
Toxic author
```

### Settings

Users should be able to configure:

1. Gemini API key.
2. Privacy notice acceptance.
3. Clear saved Gemini API key.

Operational controls such as pause/resume and manual analysis live in the popup, not the settings page. Model selection, key storage mode, cache behavior, analysis depth, sensitivity, temperature, max output tokens, highlight intensity, and UI mode are internal defaults for the simplified customer-facing MVP.

## 15. Caching

The extension may cache analysis locally to reduce cost.

Cache key:

```text
hash(post_text + model_name + prompt_version)
```

Cache value:

```json
{
  "marker": "red",
  "information_quality_score": 28,
  "misinformation_risk_score": 76,
  "manipulation_pressure_score": 82,
  "overall_risk_score": 79,
  "signals": [],
  "created_at": "timestamp",
  "model": "model-name",
  "prompt_version": "v1"
}
```

Cache should remain local only.

The simplified customer-facing settings page does not expose cache controls. Users can clear cached extension data by clearing extension/browser data.

## 16. Error Handling

### Missing API Key

```text
No Gemini API key configured. Add your Gemini API key in settings.
```

### Provider Error

```text
Gemini returned an error. Check your API key, billing status, or rate limits.
```

### No Posts Detected

```text
No visible LinkedIn posts detected. Scroll to your feed and try again.
```

### Invalid LLM Response

```text
Gemini returned an invalid response. Try again in a moment.
```

### Rate Limit

```text
Your Gemini rate limit was reached. Try fewer posts or wait before analyzing again.
```

## 17. Technical Architecture

```text
LinkedIn Page
   |
   v
Content Script
   - Detect visible posts
   - Extract text
   - Render green/yellow/red feed markers
   - Send analysis request
   |
   v
Background Service Worker
   - Reads Gemini settings
   - Calls Gemini API
   - Handles errors
   - Returns JSON
   |
   v
Extension Storage
   - Gemini API key/config
   - Local cache
   - User preferences
   |
   v
Options Page / Popup / Side Panel
   - User setup
   - Pause/resume controls
   - Results display
```

### DOM Extraction Strategy

The extension should avoid fragile assumptions where possible.

Detection approach:

1. Identify feed containers.
2. Find visible post-like elements.
3. Extract human-visible text.
4. Remove duplicate UI text.
5. Ignore buttons such as Like, Comment, Repost, and Send.
6. Ignore navigation and sidebar content.
7. Hash text to deduplicate.

Pseudo-code:

```ts
function getVisiblePosts(): ExtractedPost[] {
  const candidates = document.querySelectorAll('[data-urn], .feed-shared-update-v2');

  return Array.from(candidates)
    .filter(isVisible)
    .map(extractPostText)
    .filter(post => post.text.length > 50)
    .filter(deduplicateByHash);
}
```

## 18. Security Requirements

1. Content scripts must never directly access API keys.
2. API keys should not be logged.
3. API keys should not be sent to any server controlled by the product creator.
4. No analytics should capture post text or keys.
5. Console logs should not contain post text in production.
6. Users should be warned before enabling persistent key storage.
7. Local proxy mode should be considered later for advanced users.
8. Extension should be open source if possible to increase trust.

## 19. Legal and Policy Considerations

Before public launch, the project should review:

1. LinkedIn terms of service.
2. Chrome Web Store policies.
3. Data privacy obligations.
4. Whether injecting UI into LinkedIn pages creates platform policy risk.
5. Whether the product should be released as:
   - Personal local tool
   - Open-source developer tool
   - Chrome Web Store extension
   - Manual text analyzer
   - Browser side panel assistant

The safest public version should make background analysis clearly opt-in during setup, limit analysis to visible posts, avoid auto-scrolling, and provide a manual text-selection fallback if platform policy risk becomes too high.

## 20. MVP Milestones

### Milestone 1: Prototype

- Create Chrome extension boilerplate.
- Add LinkedIn content script.
- Detect visible post text.
- Show extracted post count and placeholder feed markers.
- Do not include LLM integration yet.

### Milestone 2: LLM Integration

- Add Gemini key setup and privacy acceptance.
- Support Gemini API only.
- Send one post for analysis.
- Return structured marker, score, and signal JSON.

### Milestone 3: Inline UI

- Add subtle green, yellow, or red marker to each analyzed post.
- Show detailed result on click.
- Add pause and resume controls.
- Add error states.

### Milestone 4: Privacy and Security

- Add local Chrome extension key storage.
- Add local cache.
- Remove production logs that contain post text, analysis output, or sensitive content.
- Add privacy notice.

### Milestone 5: Provider Expansion

- Evaluate OpenAI, Anthropic, Ollama/local endpoint, or custom provider support.
- Add local proxy option if the project needs stronger key isolation.
- Keep provider expansion separate from the first-version Gemini implementation.

### Milestone 6: Beta Release

- Test on multiple LinkedIn feed layouts.
- Improve selector robustness.
- Add onboarding.
- Add feedback mechanism that does not collect post text by default.

## 21. Success Metrics

Since the product should avoid invasive analytics, success metrics should be privacy-preserving.

Possible metrics:

1. Number of installs.
2. Number of active users.
3. Opt-in feedback count.
4. User-reported usefulness.
5. Local-only satisfaction survey.
6. Number of GitHub stars, if open source.
7. Number of issues or feature requests.

Avoid collecting:

1. LinkedIn post text.
2. Author names.
3. Profile URLs.
4. Feed history.
5. Analysis outputs without explicit consent.

## 22. Future Features

1. Manual text selection analyzer.
2. Support for X/Twitter.
3. Support for Reddit.
4. Support for YouTube comments.
5. Local-only classifier model.
6. OpenAI, Anthropic, Ollama/local model, and custom endpoint support.
7. Rules-based fast pre-filtering.
8. Custom user-defined manipulation categories.
9. Educational explanations.
10. "Rewrite this post to be less manipulative."
11. "Show me the neutral version of this post."
12. Team training mode.
13. Browser side panel mode.
14. Export analysis report locally.
15. Prompt version comparison.
16. Model comparison mode.
17. Retrieval-assisted fact checking for sources where the user explicitly enables it.

## 23. Major Risks

### Platform Risk

LinkedIn may object to extensions that modify or analyze the feed. The product should minimize automation and avoid scraping behavior.

### Privacy Risk

Even if the creator stores nothing, post text may be sent to the Gemini API. This must be clearly disclosed.

### Accuracy Risk

Misinformation and manipulation detection are subjective when based only on post text. The product must show evidence, confidence, and counter-readings, and should frame misinformation as risk unless stronger verification is available.

### Security Risk

Users' Gemini API keys are sensitive. The extension should store keys only in Chrome extension storage on the user's device and avoid logging or bundling keys.

### Cost Risk

Users may accidentally spend too much on Gemini calls. The product should show estimated token usage and allow users to limit the number of posts analyzed.

### DOM Fragility Risk

LinkedIn's page structure may change. The extension should be tested regularly and designed with resilient extraction logic.

## 24. Open Questions

1. How subtle should the default green, yellow, and red visual treatment be?
2. Should Feed Lens default to feed highlights, marker-only mode, or side-panel-only mode?
3. Should the product be open source from day one?
4. Which provider should be added after Gemini, if any?
5. Should the first version be LinkedIn-only or generic text-selection based?
6. Should there be a "neutral rewrite" feature?
7. Should there be a conservative scoring mode to reduce false positives?

## 25. Recommended MVP Decision

For the safest first version:

```text
Platform: Chrome extension
Target: LinkedIn feed
Mode: Seamless visible-post analysis after user setup
UI: Subtle green/yellow/red feed markers + side panel details
AI: Gemini BYOK
Provider: Gemini API only
Storage: Local Chrome extension storage for the Gemini key
Backend: None
Data: No creator-side storage
Release: Open-source developer beta
```

This creates a useful, privacy-first tool while minimizing cost, backend complexity, and user-data responsibility.
