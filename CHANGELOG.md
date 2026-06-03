# Changelog

## v2.0.0 — UTHY OS (2026-06-03)

### Major Release — Complete Architecture Rewrite

**Uthy OS** is now a full terminal-native AI operating system.

### New Core Architecture
- **Kernel** (`src/kernel.js`) — Event-driven command router, module lifecycle manager, process manager, and system bus
- **Provider System** (`src/providers.js`) — 15+ AI providers with 300+ models, unified interface, fallback chains, rate limiting
- **Storage Engine** (`src/storage.js`) — AES-256-GCM encrypted vault, per-user isolation, API key management, import/export
- **3D Renderer** (`src/engine/renderer.js`) — 25 themes, 20 spinners, box drawing, tables, charts, gauges, animations
- **Skill Engine** (`src/modules/skillEngine.js`) — 14 built-in skills, auto-generation, sandboxing, versioning, permissions

### New Features
- 15+ AI provider integrations (OpenAI, Anthropic, Google, Ollama, OpenRouter, Groq, Together, DeepSeek, Mistral, Cohere, Fireworks, Perplexity, xAI, Cerebras, SambaNova)
- 25 cyberpunk themes with live switching
- 3D animated boot sequence with engine checklist
- Multi-user authentication with per-user isolation
- AES-256 encrypted API key vault
- Per-user persistent memory, config, history, skills
- Command autocomplete and fuzzy matching
- Natural language input routing to AI
- Macro recording and replay
- User profile import/export
- Rich terminal UI (boxes, tables, charts, gauges, spinners, progress bars)
- Wave, glitch, gradient, and particle animation effects
- System status dashboard
- Watchdog health monitoring
- Gateway and MCP protocol support
- 14 built-in skills with auto-generation
- Skill search, enable/disable, and permission system
- Provider hot-swap and fallback routing
- Offline-first operation

### Commands Added
- `/providers` — Manage AI providers and API keys
- `/providers models` — List all available models
- `/providers set-key` — Set API key for a provider
- `/providers usage` — View usage statistics
- `/skills` — Manage skills
- `/skills search` — Search skills
- `/skills generate` — Auto-generate skill from description
- `/skills stats` — Skill statistics
- `/memory save/get/list` — Persistent memory management
- `/config get/set/list` — Configuration management
- `/profile export/import` — User profile backup/restore
- `/system info/env` — System information
- `/animate wave|glitch|gradient` — Animation demos
- `/history` — Command history
- `/watchdog` — Watchdog status
- `/gateway` — Gateway status
- `/mcp` — MCP server status

### Architecture
- Modular kernel with event bus
- Provider abstraction layer
- Encrypted storage with per-user isolation
- Plugin-based skill engine
- Responsive terminal UI engine
- Graceful degradation (works without AI providers)

### Dependencies
- Reduced to `commander` only (removed heavy optional deps from base install)

---

## v1.8.0 (2026-06-01)

- 25 themes
- Interactive REPL with HUD
- Chat panel with file upload
- Boot animation
- Auth system
- Memory, Skills, Goals, Models, Cron engines
- MCP, Gateway, Delegation
- Flakiness detection, parallel testing, visual regression
- Session replay, environment provisioning
