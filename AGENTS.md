# AGENTS

## Purpose

This repository builds **FeedLens**, a privacy-first Chrome extension for scoring and surfacing manipulation-risk and information-quality signals on visible LinkedIn and X posts.

## First-Version Product Scope

- The first implementation supports **Gemini only**.
- Use `GEMINI_API_KEY` as the canonical key name for local testing and documentation.
- Local developer testing may load `GEMINI_API_KEY` from a local `.env` file.
- Do not add OpenAI, Anthropic, Ollama, local model, or custom provider support unless explicitly requested later.
- Do not compile or bundle any `.env` value into a distributable Chrome extension build.
- Supported platform scope is LinkedIn plus X home and profile timelines. Do not add broad host permissions, additional platforms, X API support, or automated engagement unless explicitly requested later.

## Build and Release Packaging

- For agent-created local browser testing or debugging `dist/` output, use `npm run build:dev` so the dev-only debug log page is available.
- For GitHub release assets, use `npm run build` and treat that production build as the only release-packaging source.
- Never publish, upload, or attach a debug-mode `dist/` output to a GitHub release.

## First Reads for Agents

Before any other changes, AI agents should read in this order:

1. `AGENTS.md` (this file) for canonical operating rules.
2. `README.md` for repository purpose and current status.
3. `docs/product-specification.md` for product requirements, scoring model, and privacy guarantees.
4. `git status --short` to understand local state before editing.

## Important Files and Directories

- `AGENTS.md`: Canonical instructions for all agents (source of truth for agent behavior).
- `README.md`: Public-facing project summary and onboarding context.
- `docs/`: Architecture, requirements, and specification artifacts.
- `.agents/`: Shared agent assets (portable across tools).
- `.codex/`: Codex-specific setup and environment automation.
- `.claude/`, `.cursor/`, `.codex/`: Adapter directories that point to shared `.agents` assets.

## Privacy and Sensitivity Boundaries

- Do not add real API keys, secrets, or user data.
- Never include secrets in code examples or generated files unless they are clearly placeholders.
- Treat `.env` files and `GEMINI_API_KEY` values as sensitive. Do not print, commit, copy, or expose them in logs, docs, tests, or screenshots.
- Avoid adding tooling that uploads, transmits, or logs raw feed content from users.
- Treat any existing user data, logs, or config as sensitive and remove only what is explicitly requested.
- Prefer local-only operations; keep analysis and state handling aligned with the product's privacy-first posture.

## Recency and Source-of-Truth Rules

- `AGENTS.md` is the source of truth for AI agent behavior and this file should be the first instruction source.
- `README.md` and `docs/product-specification.md` are authoritative for product context and requirements.
- For conflicts, prefer newer edits in `AGENTS.md` over older files only if they are directly related to agent workflow.
- When uncertain, check file timestamps/history before making behavior changes.

## Coding and Editing Conventions

- Keep shared instructions in canonical files, not duplicated in tool-specific folders.
- Favor small, targeted edits with clear intent.
- Prefer symlinks over duplicated copies for tool adapters.
- Use ASCII text for new files unless existing file already uses non-ASCII intentionally.
- Keep changes minimal and explain assumptions when doing cross-platform or path-level work.

## Verification Expectations

- Run requested checks after edits:
  - symlink check command provided below.
  - `git diff --check`.
  - `git status --short`.
- Verify all tool adapters resolve to shared `.agents` paths (no duplicated copies).

## Agent Asset Layout

- `.agents/skills/`:
  - Product-neutral, reusable workflows.
  - Each skill lives at `.agents/skills/<skill-name>/SKILL.md`.
  - Use `references/` for extra docs and `scripts/` for helper scripts when needed.
- `.agents/commands/`:
  - Lightweight prompt/command templates.
  - Each command is a single markdown file `.agents/commands/<command-name>.md`.

## Tool Compatibility Adapters

Tool-specific folders should only adapt to shared assets:

- `.claude/skills` -> `../.agents/skills`
- `.claude/commands` -> `../.agents/commands`
- `.cursor/skills` -> `../.agents/skills`
- `.cursor/commands` -> `../.agents/commands`
- `.codex/skills` -> `../.agents/skills`

Do not store portable skills/commands as separate copies in these folders.

## Codex-Specific Files

- Keep Codex-only runtime/setup files under `.codex/environments/`.
- `.codex/environments/` may include:
  - `environment.toml`
  - `setup-worktree.sh`
  - `cleanup-worktree.sh`
- Do not place reusable skills or saved prompts under `.codex` except through the required symlinks above.

## Notes for New Agents

When starting collaboration, read this file, follow the canonical layout, and avoid creating another source-of-truth file for agent behavior.
