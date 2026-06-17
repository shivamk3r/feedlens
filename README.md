# Feed Lens

Feed Lens is a privacy-first Chrome extension concept for highlighting informational quality and manipulation-risk signals in LinkedIn feed posts.

## First-Version Scope

The first version supports Gemini only. Users bring their own Gemini API key, and local developer testing should use `GEMINI_API_KEY` from a local `.env` file. Use `.env-example` as the placeholder template.

Do not commit `.env` files or real API keys. Future provider support can be added later, but OpenAI, Anthropic, Ollama, local model, and custom endpoint support are out of scope for the first version.

## Agent Context

- `AGENTS.md` is the canonical root guide for all AI agents.
- First-version implementation and docs should assume Gemini-only provider support through `GEMINI_API_KEY`.
- `.agents/skills` contains reusable, portable agent workflows.
- `.agents/commands` contains reusable saved prompts/command templates.
- `.claude/`, `.cursor/`, and `.codex/` are compatibility/adaptor layers that point to `.agents`.
- `.codex/environments/` is for Codex-only setup and environment files.

Please read `AGENTS.md` first before editing repository files.
