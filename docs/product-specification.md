# Feed Lens Product Specification

## 1. Product Overview

### Product Name

Fixed name: **Feed Lens**

### One-Line Description

Feed Lens is a privacy-first Chrome extension that works quietly behind the scenes to help users identify misinformation risk, manipulation, engagement-bait, psychological pressure, and high-quality information in LinkedIn feed posts using their own LLM API key or local model.

### Product Summary

Feed Lens analyzes posts visible in a user's LinkedIn feed and overlays subtle, color-coded guidance directly on the feed. Posts with high-quality information are marked green, ambiguous or mixed-quality posts are marked yellow, and posts with strong misinformation risk or manipulative pressure are marked red.

The extension does not require a user account, does not operate a backend server, does not store LinkedIn feed data, and does not pay for LLM usage. Users bring their own model provider key, such as an OpenAI, Anthropic, Gemini, or local model configuration.

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

It subtly marks posts as green, yellow, or red based on signals like evidence quality, misinformation risk, urgency, fear framing, vague authority, social proof pressure, and engagement bait. It uses your own AI model key or local model, and your feed does not pass through our servers.
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
   - Users provide their own API key or local model endpoint.
   - Users control model provider, cost, and privacy tradeoffs.

3. **Seamless but user-controlled**
   - Once configured, the extension can analyze visible feed posts quietly in the background.
   - Users can pause analysis, disable highlighting, clear results, or switch to manual-only behavior.
   - The extension does not analyze anything until the user configures a provider and accepts the privacy notice.

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
4. Allow users to configure their own LLM provider key or local endpoint.
5. Avoid storing user data on external servers.
6. Provide inline feed markings plus a side panel or popover for details.
7. Work seamlessly behind the scenes while preserving user controls to pause, re-analyze, hide, or clear results.

### Long-Term Goals

1. Support multiple social platforms.
2. Support local models.
3. Provide personalized sensitivity settings.
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

## 6. MVP User Flows

### First-Time Setup

1. User installs the Chrome extension.
2. User opens the extension settings page.
3. User selects model provider:
   - OpenAI
   - Anthropic
   - Gemini
   - Ollama or local endpoint
   - Custom OpenAI-compatible endpoint
4. User enters API key or local endpoint.
5. User chooses storage mode:
   - Session-only storage: key is cleared when the browser closes.
   - Local storage: key persists on the user's device.
   - Local proxy mode: key is kept outside the extension and requests go to a local endpoint.
6. User accepts the privacy notice:

```text
Visible posts are analyzed using your configured provider. Feed Lens does not operate a backend and does not store your data.
```

7. User opens the LinkedIn feed.
8. Extension starts analyzing visible posts in the background.
9. Extension marks posts with subtle green, yellow, or red treatment.
10. User can pause background analysis or switch to manual analysis from the popup.

### Normal Usage

1. User visits LinkedIn feed.
2. Extension detects posts as they become visible.
3. Extension extracts post text without auto-scrolling or engaging with the page.
4. Extension sends visible post text to the configured model provider or local endpoint.
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
   - Handles communication with LLM providers.
   - Reads API key from extension storage.
   - Sends post text for analysis.
   - Handles provider errors and invalid responses.
   - Returns structured results to the content script.

3. **Popup UI**
   - Shows current status.
   - Provides pause, resume, and re-analyze visible posts actions.
   - Shows number of detected posts.
   - Shows setup warnings and error states.

4. **Options/settings page**
   - Provider selection.
   - API key input.
   - Model selection.
   - Privacy controls.
   - Cache controls.
   - Local endpoint configuration.

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

For MVP, keep permissions narrow and limited to LinkedIn. Behind-the-scenes analysis should only run after the user configures a provider, accepts the privacy notice, and visits LinkedIn in their own browser session. Avoid broad browsing permissions and do not analyze non-LinkedIn pages unless support is explicitly added later.

## 9. Data Handling and Privacy

### Data Processed by the Extension

The extension may process:

1. Visible LinkedIn post text.
2. Post author display name, if needed for UI context.
3. Public engagement text visible in the post, if needed.
4. User's model provider settings.
5. User's API key or local endpoint.
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

### Storage Modes

Default mode should be privacy-preserving.

1. **Session mode**
   - API key is stored in memory or session storage.
   - API key is cleared when the browser closes.
   - Best privacy.

2. **Local mode**
   - API key is stored locally in the user's browser.
   - More convenient but less private.
   - User should see a clear warning before enabling persistent key storage.

3. **Local proxy mode**
   - API key is never stored in the extension.
   - Extension calls a local endpoint such as `http://localhost:8787/analyze`.
   - Recommended for advanced users who want stronger control over API keys.

### Privacy Notice

Suggested user-facing copy:

```text
Feed Lens analyzes visible LinkedIn posts using the model provider you configure.

We do not run a backend server.
We do not store your LinkedIn feed.
We do not collect your API key.
We do not sell or share your data.

When Feed Lens analyzes a visible post, the post text may be sent directly from your browser to your selected model provider, such as OpenAI, Anthropic, Gemini, or your local model endpoint. Your use of that provider is subject to their privacy policy and billing terms.
```

## 10. LLM Provider Support

### MVP Providers

1. OpenAI API
2. Anthropic API
3. Gemini API
4. Ollama or local model
5. Custom OpenAI-compatible endpoint

### Model Configuration

Users should be able to configure:

1. Provider
2. API key
3. Model name
4. Base URL for custom providers
5. Temperature
6. Max tokens
7. Analysis depth:
   - Fast
   - Balanced
   - Deep

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

1. Model provider.
2. API key.
3. Model name.
4. Local endpoint.
5. Seamless background analysis on LinkedIn: on or off.
6. Manual re-analysis for visible posts.
7. Store local cache: on or off.
8. Clear cache.
9. Storage mode:
   - Session only
   - Local persistent
   - Local proxy
10. Highlight intensity:
    - Subtle
    - Standard
    - Strong
11. Analysis sensitivity:
    - Conservative
    - Balanced
    - Strict
12. UI mode:
    - Feed highlights
    - Marker only
    - Side panel only
    - Both

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

Users should be able to clear cache anytime.

## 16. Error Handling

### Missing API Key

```text
No model provider configured. Add your API key or local model endpoint in settings.
```

### Provider Error

```text
The model provider returned an error. Check your API key, model name, billing status, or rate limits.
```

### No Posts Detected

```text
No visible LinkedIn posts detected. Scroll to your feed and try again.
```

### Invalid LLM Response

```text
The model returned an invalid response. Try again or switch models.
```

### Rate Limit

```text
Your model provider rate limit was reached. Try fewer posts or wait before analyzing again.
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
   - Reads provider settings
   - Calls LLM provider
   - Handles errors
   - Returns JSON
   |
   v
Extension Storage
   - API key/config
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
7. Local proxy mode should be recommended for advanced users.
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

- Add provider settings.
- Support OpenAI-compatible API.
- Send one post for analysis.
- Return structured marker, score, and signal JSON.

### Milestone 3: Inline UI

- Add subtle green, yellow, or red marker to each analyzed post.
- Show detailed result on click.
- Add pause and resume controls.
- Add error states.

### Milestone 4: Privacy and Security

- Add session-only key mode.
- Add local cache.
- Add clear cache button.
- Remove production logs that contain post text, analysis output, or sensitive content.
- Add privacy notice.

### Milestone 5: Local Model Support

- Add Ollama/local endpoint support.
- Add local proxy option.
- Add custom model configuration.

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
6. Rules-based fast pre-filtering.
7. Custom user-defined manipulation categories.
8. Educational explanations.
9. "Rewrite this post to be less manipulative."
10. "Show me the neutral version of this post."
11. Team training mode.
12. Browser side panel mode.
13. Export analysis report locally.
14. Prompt version comparison.
15. Model comparison mode.
16. Retrieval-assisted fact checking for sources where the user explicitly enables it.

## 23. Major Risks

### Platform Risk

LinkedIn may object to extensions that modify or analyze the feed. The product should minimize automation and avoid scraping behavior.

### Privacy Risk

Even if the creator stores nothing, post text may be sent to third-party model providers. This must be clearly disclosed.

### Accuracy Risk

Misinformation and manipulation detection are subjective when based only on post text. The product must show evidence, confidence, and counter-readings, and should frame misinformation as risk unless stronger verification is available.

### Security Risk

Users' API keys are sensitive. The extension should provide session-only and local-proxy options.

### Cost Risk

Users may accidentally spend too much on LLM calls. The product should show estimated token usage and allow users to limit the number of posts analyzed.

### DOM Fragility Risk

LinkedIn's page structure may change. The extension should be tested regularly and designed with resilient extraction logic.

## 24. Open Questions

1. How subtle should the default green, yellow, and red visual treatment be?
2. Should Feed Lens default to feed highlights, marker-only mode, or side-panel-only mode?
3. Should API keys be stored persistently or session-only by default?
4. Should the product be open source from day one?
5. Should local model support be part of MVP or v2?
6. Should the first version be LinkedIn-only or generic text-selection based?
7. Should there be a "neutral rewrite" feature?
8. Should there be a conservative scoring mode to reduce false positives?

## 25. Recommended MVP Decision

For the safest first version:

```text
Platform: Chrome extension
Target: LinkedIn feed
Mode: Seamless visible-post analysis after user setup
UI: Subtle green/yellow/red feed markers + side panel details
AI: BYOK
Storage: Session-only key by default
Backend: None
Data: No creator-side storage
Release: Open-source developer beta
```

This creates a useful, privacy-first tool while minimizing cost, backend complexity, and user-data responsibility.
