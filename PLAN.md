# UTHY OS v2.0 — Implementation Plan

## Architecture Overview
Transform existing v1.8.0 testing toolkit into a full terminal-native AI OS.

## Phase 1: Core Kernel & Architecture (CRITICAL)
- [ ] 1.1 Event-driven kernel (`src/kernel.js`) — command router, event bus, lifecycle
- [ ] 1.2 Module loader with hot-reload (`src/loader.js`)
- [ ] 1.3 Provider abstraction layer (`src/providers/`) — 300+ model support
- [ ] 1.4 Encrypted storage engine (`src/storage.js`) — AES-256 local vault
- [ ] 1.5 Process sandbox (`src/sandbox.js`) — isolated execution

## Phase 2: Terminal UI Engine (HIGH)
- [ ] 2.1 3D rendering engine (`src/engine/renderer.js`) — depth, layers, parallax
- [ ] 2.2 Animation system (`src/engine/animations.js`) — smooth transitions
- [ ] 2.3 Panel layout system (`src/engine/panels.js`) — resizable, bordered
- [ ] 2.4 ASCII art engine (`src/engine/ascii.js`) — interactive, reactive
- [ ] 2.5 Boot sequence (`src/engine/boot.js`) — XP-style animated boot
- [ ] 2.6 Theme engine upgrade — 25+ themes, live switching, marketplace-ready
- [ ] 2.7 Status bar, input area, HUD components

## Phase 3: Auth & Multi-User (HIGH)
- [ ] 3.1 Enhanced auth with session isolation
- [ ] 3.2 Per-user directories, configs, themes, history
- [ ] 3.3 User switching without restart
- [ ] 3.4 Permission system for skills

## Phase 4: AI Provider System (HIGH)
- [ ] 4.1 OpenAI-compatible adapter
- [ ] 4.2 Anthropic adapter
- [ ] 4.3 Google/Gemini adapter
- [ ] 4.4 Ollama/local adapter
- [ ] 4.5 OpenRouter adapter (300+ models)
- [ ] 4.6 LiteLLM-compatible router
- [ ] 4.7 Provider hot-swap & fallback chains
- [ ] 4.8 API key vault

## Phase 5: Skills & Memory (MEDIUM)
- [ ] 5.1 Skill registry with versioning
- [ ] 5.2 Skill sandboxing
- [ ] 5.3 Per-user persistent memory
- [ ] 5.4 Session memory
- [ ] 5.5 Preference learning

## Phase 6: Command System (MEDIUM)
- [ ] 6.1 Natural language parser
- [ ] 6.2 Slash commands
- [ ] 6.3 Alias system
- [ ] 6.4 Macro recorder
- [ ] 6.5 Autocomplete engine
- [ ] 6.6 Command history with replay

## Phase 7: Networking & Storage (MEDIUM)
- [ ] 7.1 Offline-first operation
- [ ] 7.2 Proxy support
- [ ] 7.3 Rate limiter
- [ ] 7.4 API key vault (encrypted)
- [ ] 7.5 Import/export profiles

## Phase 8: Polish & Ship (HIGH)
- [ ] 8.1 npm publish
- [ ] 8.2 curl/pip/irm install scripts
- [ ] 8.3 README with screenshots
- [ ] 8.4 Docker container
- [ ] 8.5 GitHub Actions CI
