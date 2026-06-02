# UTHY AGENTIC OS

> An autonomous agentic operating system for your terminal — cyberpunk HUD overlay, 25 themes, chat panel with file upload, persistent memory, knowledge base, and 10 core engines.

[![npm](https://img.shields.io/npm/v/uthy-agentic-os.svg)](https://www.npmjs.com/package/uthy-agentic-os)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg)](https://nodejs.org)

---

## Installation

### From npm (recommended)

```bash
npm install -g uthy-agentic-os
```

### From GitHub

```bash
git clone https://github.com/uthumany/uthy-agentic-os.git
cd uthy-agentic-os
npm install -g .
```

### Verify

```bash
uthy --version   # 1.1.0
uthy --help      # Show all commands
uthy             # Launch interactive REPL
```

---

## Quick Start

```bash
# Launch interactive REPL with cyberpunk HUD
uthy

# Run a web test
uthy test:web https://example.com

# Store a memory
uthy memory add "I prefer dark themes"

# Search the web
uthy search "nodejs best practices"

# Index your project for semantic search
uthy kb index ./src

# Schedule a recurring task
uthy cron add 1h "npm test"

# View goal kanban board
uthy goal kanban
```

---

## Features

### 🎨 Cyberpunk HUD Overlay
- Real-time holographic console at top-right corner
- Seven-segment flip clock with live tick
- Social links with floating UI markers
- Scanline dividers and corner bracket framing
- No rigid box borders — sci-fi cockpit aesthetic

### 🖌️ 25 Terminal Themes
`cyber` · `matrix` · `fire` · `ocean` · `neon` · `obsidian` · `neonblast` · `forest` · `amber` · `polar` · `rusted` · `cobalt` · `sepia` · `midnight` · `solarflare` · `slate` · `cherry` · `glacial` · `ember` · `lavender` · `moss` · `crimson` · `desert` · `steel` · `twilight`

### 💬 Chat Panel with File Upload
- Multi-line text input with `@filepath` syntax
- Support for 70+ file types (code, docs, images, config, archives)
- File preview with metadata (size, lines, type)
- File tree walker for directory browsing

### 🧠 10 Core Engines (137 Methods)

| # | Engine | Methods | Description |
|---|--------|---------|-------------|
| 1 | **Memory** | 18 | Persistent facts, user preferences, scoring & decay |
| 2 | **Skills** | 13 | Reusable workflow templates (5 built-in) |
| 3 | **Goals** | 11 | Kanban board, priorities, completion tracking |
| 4 | **Models** | 18 | Multi-provider router (OpenAI, Anthropic, Google, Ollama) |
| 5 | **Cron** | 15 | Scheduled tasks with interval/cron/ISO scheduling |
| 6 | **Knowledge** | 11 | TF-IDF search engine, directory indexing |
| 7 | **Sessions** | 12 | Session recording, checkpoints, history search |
| 8 | **Web Search** | 9 | DuckDuckGo search, URL content extraction |
| 9 | **Watchdog** | 19 | URL/file monitoring, heartbeat, nudges |
| 10 | **Delegation** | 11 | Parallel task execution (up to 3 workers) |

---

## Commands Reference

### Testing
| Command | Description |
|---------|-------------|
| `test:web <url>` | Run Playwright web test |
| `test:mobile <url> [device]` | Mobile device emulation test |
| `test:desktop <app>` | Desktop application test |
| `test:cli <command>` | CLI command test |
| `test:api <url> [method] [data]` | API endpoint test |
| `test:accessibility <url>` | axe-core accessibility audit |
| `test:performance <url>` | Lighthouse performance audit |
| `test:flakiness <url> [n]` | Flakiness detection |
| `test:visual <url>` | Visual regression test |

### Generation & Recording
| Command | Description |
|---------|-------------|
| `generate:assertions <url>` | AI test oracle — auto-generate assertions |
| `generate:report <file> [fmt]` | Generate JSON/Markdown report |
| `generate:fix-prompt <file>` | Generate fix prompts from errors |
| `capture:screenshot <url>` | Capture screenshot |
| `record:video <url>` | Record video |
| `record:trace <url> [sec]` | Record session trace (.uthyreplay) |
| `run:parallel <urls>` | Parallel test execution |
| `provision <dir>` | Provision test environment |

### 🧠 Memory
| Command | Description |
|---------|-------------|
| `memory add <fact>` | Store a persistent memory |
| `memory list` | List all memories by score |
| `memory search <query>` | Search memories by keyword |
| `memory stats` | Memory statistics |
| `memory remove <id>` | Remove a memory |

### ⚡ Skills
| Command | Description |
|---------|-------------|
| `skill list` | List available workflow skills |
| `skill load <name>` | Load a skill into context |
| `skill search <query>` | Search skills by keyword |
| `skill stats` | Skill statistics |

### 🎯 Goals
| Command | Description |
|---------|-------------|
| `goal add <text>` | Add a new goal |
| `goal list` | List all goals |
| `goal done <id>` | Mark goal as completed |
| `goal kanban` | Visual kanban board |
| `goal review` | Goal progress summary |

### 🤖 Models
| Command | Description |
|---------|-------------|
| `model list` | List available AI models |
| `model active` | Show active model |
| `model set <id>` | Set active model |
| `model route <type>` | Find best model for task type |
| `model usage` | Show token usage & cost |
| `model providers` | List configured providers |

### ⏰ Cron
| Command | Description |
|---------|-------------|
| `cron add <schedule> <command>` | Schedule a recurring task |
| `cron list` | List all cron jobs |
| `cron run <id>` | Manually trigger a job |
| `cron pause <id>` | Pause a job |
| `cron resume <id>` | Resume a job |
| `cron remove <id>` | Remove a job |
| `cron stats` | Cron statistics |

### 📚 Knowledge Base
| Command | Description |
|---------|-------------|
| `kb index <dir>` | Index a directory for search |
| `kb search <query>` | TF-IDF search across files |
| `kb stats` | Index statistics |
| `kb forget <path>` | Remove a file from index |
| `kb rebuild <dir>` | Rebuild the knowledge index |

### 📝 Sessions
| Command | Description |
|---------|-------------|
| `session list` | List recent sessions |
| `session search <query>` | Search session history |
| `session checkpoint <label>` | Save a checkpoint |
| `session stats` | Session statistics |

### 🌐 Web
| Command | Description |
|---------|-------------|
| `search <query>` | Search the web (DuckDuckGo) |
| `extract <url>` | Extract text from a URL |

### 👁️ Watchdog
| Command | Description |
|---------|-------------|
| `watch add <url/file>` | Start monitoring a target |
| `watch list` | List active watches |
| `watch check` | Check all watches now |
| `watch heartbeat` | Record activity heartbeat |
| `watch nudge <message>` | Send a nudge notification |
| `watch stats` | Watchdog statistics |

### 🔀 Delegation
| Command | Description |
|---------|-------------|
| `delegate <task>` | Delegate a task to a worker |
| `delegate parallel <t1> \| <t2>` | Run tasks in parallel |
| `delegate list` | List delegations |
| `delegate stats` | Delegation statistics |

### 💬 Chat & Files
| Command | Description |
|---------|-------------|
| `chat` | Show chat input panel |
| `attach <file>` | Attach a file for processing |
| `files [dir]` | Show file tree of directory |
| `upload` | Show supported file types |

### Shell
| Command | Description |
|---------|-------------|
| `help` | Show all commands |
| `about` | About UTHY AGENTIC OS |
| `themes` | List available themes |
| `theme <name>` | Change active theme |
| `social` | Show social media links |
| `hud` | Refresh the HUD overlay |
| `clear` | Clear screen |
| `quit / exit` | Exit UTHY |

---

## Project Structure

```
uthy-agentic-os/
├── src/
│   ├── index.js              # CLI entry point + REPL (50+ commands)
│   ├── ui.js                 # Banner, 25 themes, HUD overlay, UI helpers
│   └── modules/
│       ├── memory.js         # 🧠 Persistent memory engine
│       ├── skills.js         # ⚡ Skill system with built-in workflows
│       ├── goals.js          # 🎯 Goal tracker + kanban board
│       ├── models.js         # 🤖 Multi-model router
│       ├── cron.js           # ⏰ Scheduled task engine
│       ├── knowledge.js      # 📚 TF-IDF knowledge base
│       ├── sessions.js       # 📝 Session recording & search
│       ├── websearch.js      # 🌐 Web search & URL extraction
│       ├── watchdog.js       # 👁️ Monitoring & heartbeat
│       ├── delegation.js     # 🔀 Parallel task delegation
│       ├── chat.js           # 💬 Chat panel & file upload
│       ├── flakiness.js      # Flakiness detection & self-healing
│       ├── parallel.js       # Parallel execution engine
│       ├── visual_regression.js  # Visual regression testing
│       ├── oracle.js         # AI test oracle
│       ├── session_replay.js # Session replay (.uthyreplay)
│       ├── provisioner.js    # Environment provisioning
│       ├── web.js            # Web testing
│       ├── mobile.js         # Mobile testing
│       ├── desktop.js        # Desktop testing
│       ├── cli.js            # CLI testing
│       ├── api.js            # API testing
│       ├── accessibility.js  # Accessibility testing
│       ├── performance.js    # Performance testing
│       ├── evidence.js       # Screenshot & video capture
│       ├── report.js         # Report generation
│       └── fix_prompt.js     # Fix prompt generation
├── tests/                    # Unit tests
├── examples/                 # Example scripts
├── docs/                     # Documentation
└── package.json
```

---

## Configuration

UTHY stores all data in `~/.uthy/`:

```
~/.uthy/
├── config.json           # User preferences (theme, history size)
├── history               # REPL command history
├── memory/
│   └── memory.json       # Persistent memories
├── skills/               # Skill templates (.md files)
├── goals/
│   └── goals.json        # Goal tracker data
├── models/
│   └── models.json       # AI model configurations
├── cron/
│   ├── jobs.json         # Scheduled jobs
│   └── logs/             # Per-job execution logs
├── knowledge/
│   └── index.json        # TF-IDF knowledge index
├── sessions/             # Session recordings
├── webcache/             # Web search result cache
├── watchdog/
│   ├── watches.json      # Active monitors
│   ├── heartbeat.json    # Activity heartbeat
│   └── nudges.json       # Nudge notifications
└── delegations/
    └── history.json      # Delegation history
```

---

## Built-in Skills

| Skill | Category | Description |
|-------|----------|-------------|
| `web-audit` | analysis | Full web audit: accessibility, performance, visual regression |
| `deploy-check` | deployment | Pre-deployment checklist: tests, build, lint, env vars |
| `code-review` | analysis | Review code changes: diff analysis, test coverage, style |
| `api-test` | testing | API endpoint testing: schema, auth, performance, errors |
| `monitor` | automation | Set up monitoring: uptime, errors, performance baselines |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

**uthuman & co**
- Website: [uthuman.com](https://uthuman.com)
- GitHub: [@uthumany](https://github.com/uthumany)
- Email: dev@uthuman.com
