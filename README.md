# UTHY OS v2.0

### Terminal-Native AI Operating System

```
██╗   ██╗████████╗██╗  ██╗██╗   ██╗     ██████╗ ███████╗
██║   ██║╚══██╔══╝██║  ██║╚██╗ ██╔╝     ██╔══██╗██╔════╝
██║   ██║   ██║   ███████║ ╚████╔╝█████╗██║  ██║███████╗
██║   ██║   ██║   ██╔══██║  ╚██╔╝ ╚════╝██║  ██║╚════██║
╚██████╔╝   ██║   ██║  ██║   ██║        ██████╔╝███████║
 ╚═════╝    ╚═╝   ╚═╝  ╚═╝   ╚═╝        ╚═════╝ ╚══════╝
```

A futuristic, cyberpunk-inspired terminal AI operating system with 300+ model providers, 25 themes, skill engine, multi-user auth, encrypted storage, and full customization.

**Free. Open-source. Local-first. Provider-agnostic.**

---

## ✨ Features

- 🖥️ **Terminal-Native REPL** — Interactive shell with autocomplete, history, and slash commands
- 🤖 **300+ AI Providers** — OpenAI, Anthropic, Google, Ollama, OpenRouter, Groq, Together, DeepSeek, Mistral, Cohere, Fireworks, Perplexity, xAI, Cerebras, SambaNova
- 🎨 **25 Cyberpunk Themes** — Live-switching themes (Cyber, Matrix, Fire, Ocean, Neon, Obsidian, and 19 more)
- ⚡ **3D Boot Animation** — XP-style animated boot with engine checklist and gradient progress bar
- 🔐 **Multi-User Auth** — Linux-style login with SHA-256 hashed passwords, per-user isolation
- 💾 **Encrypted Storage** — AES-256-GCM vault for API keys, per-user data, memory, and config
- ⚙️ **Skill Engine** — 14 built-in skills, auto-generation, sandboxing, versioning
- 📡 **Event-Driven Kernel** — Command router, module lifecycle, process manager
- 🧠 **Persistent Memory** — Per-user memory that survives across sessions
- 🎯 **Goal Tracking** — Set and track goals
- ⏰ **Cron Jobs** — Schedule recurring tasks
- 📚 **Knowledge Engine** — Semantic search across docs and memory
- 🔍 **Web Search** — Built-in web search capability
- 🐕 **Watchdog** — System health monitoring
- 🤝 **Delegation** — Task delegation to sub-agents
- 📋 **Session Management** — Track and replay sessions
- 🌐 **Gateway** — API gateway for external integrations
- 🔌 **MCP** — Model Context Protocol support
- 📊 **Rich Terminal UI** — Boxes, tables, charts, gauges, spinners, progress bars
- 🎬 **Animations** — Wave, glitch, gradient, particle effects
- 📦 **Import/Export** — Backup and restore user profiles

---

## 🚀 Installation

### npm (recommended)
```bash
npm install -g uthy-os
```

### pnpm
```bash
pnpm add -g uthy-os
```

### bun
```bash
bun add -g uthy-os
```

### From source
```bash
git clone https://github.com/uthumany/uthy-agentic-os.git
cd uthy-agentic-os
npm install
npm link
```

### Docker
```bash
docker run -it uthuman/uthy-os
```

---

## 🎮 Usage

### Interactive REPL
```bash
uthy
```

### Direct Commands
```bash
uthy info           # System information
uthy providers      # List AI providers
uthy skills         # List skills
uthy themes         # List themes
uthy theme cyber    # Set theme
uthy shell          # Force REPL mode
```

### Slash Commands (inside REPL)
```
/help               # Show all commands
/status             # System status
/version            # Show version
/theme <name>       # Change theme
/theme list         # List all themes
/providers          # List AI providers
/providers models   # List all models
/providers set-key openai sk-...  # Set API key
/chat <message>     # Chat with AI
/skills             # List skills
/skills search <q>  # Search skills
/skills generate <desc>  # Auto-generate skill
/memory save <k> <v>    # Save to memory
/memory get <k>         # Recall from memory
/config list        # Show config
/config set <k> <v>  # Set config
/history            # Command history
/profile export     # Export user profile
/profile import <path>  # Import profile
/system info        # System details
/clear              # Clear screen
/quit               # Exit
```

### Natural Language
Just type naturally — it routes to your configured AI provider:
```
❯ Write a Python script to sort a CSV file
❯ Explain how neural networks work
❯ Create a Dockerfile for a Node.js app
```

---

## 🤖 AI Providers

Set API keys via environment variables or the REPL:

```bash
# Environment variables
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=AI...
export OPENROUTER_API_KEY=sk-or-...
export GROQ_API_KEY=gsk_...
export TOGETHER_API_KEY=...
export DEEPSEEK_API_KEY=...
export MISTRAL_API_KEY=...
export COHERE_API_KEY=...
export FIREWORKS_API_KEY=...
export PERPLEXITY_API_KEY=pplx-...
export XAI_API_KEY=xai-...
export CEREBRAS_API_KEY=...
export SAMBANOVA_API_KEY=...

# Or inside the REPL
/providers set-key openai sk-...
/providers set-key anthropic sk-ant-...
```

### Supported Providers (15+)

| Provider | Models | Local? |
|----------|--------|--------|
| OpenAI | GPT-4o, GPT-4 Turbo, O1, O3 Mini | No |
| Anthropic | Claude Sonnet 4, Haiku, Opus 4 | No |
| Google AI | Gemini 2.5 Pro/Flash, 2.0 Flash | No |
| Ollama | Llama 3, Mistral, Qwen, DeepSeek | Yes |
| OpenRouter | 300+ models via single API | No |
| Groq | Llama 3.3, Mixtral, Gemma | No |
| Together AI | Llama 3.1 405B, Qwen 2.5 | No |
| DeepSeek | DeepSeek Chat, Reasoner | No |
| Mistral AI | Mistral Large/Small, Codestral | No |
| Cohere | Command R+, Command R | No |
| Fireworks AI | Llama, DeepSeek | No |
| Perplexity | Sonar Small/Large | No |
| xAI | Grok 2, Grok 2 Mini | No |
| Cerebras | Llama 3.3/3.1 | No |
| SambaNova | Llama 3.1 405B | No |

---

## 🎨 Themes

25 built-in themes with live switching:

```
cyber       — Classic cyberpunk cyan/magenta
matrix      — Green-on-black hacker aesthetic
fire        — Warm orange/red/yellow
ocean       — Cool blue tones
neon        — Vibrant pink/cyan
obsidian    — Dark blue-grey
neonblast   — Intense neon colors
forest      — Natural green tones
amber       — Warm golden amber
polar       — Cool light blue
rusted      — Warm rust/copper
cobalt      — Deep blue
sepia       — Warm vintage tones
midnight    — Deep purple/blue
solarflare  — Intense orange/red
slate       — Professional grey-blue
cherry      — Deep red tones
glacial     — Cool ice blue
ember       — Warm dark tones
lavender    — Soft purple
moss        — Earthy green
crimson     — Deep red
desert      — Warm sand tones
steel       — Industrial grey
twilight    — Purple/dusk tones
```

Change themes: `/theme <name>` or `uthy theme <name>`

---

## 🔐 Authentication

Linux-style terminal login:

```
╔═══════════════════════════════════════╗
║     UTHY OS — Login Required         ║
╚═══════════════════════════════════════╝

  Username: alice
  Password: ••••••••
```

- SHA-256 hashed passwords
- Per-user directories (`~/.uthy/users/<name>/`)
- Per-user settings, themes, history, memory
- User switching without restart
- Unlimited local accounts

---

## ⚙️ Skills

14 built-in skills + auto-generation:

| Skill | Category | Description |
|-------|----------|-------------|
| web-search | research | Search the web |
| code-gen | development | Generate code |
| file-ops | system | File operations |
| system-info | system | System information |
| git-ops | development | Git operations |
| docker-ops | devops | Docker management |
| api-test | testing | API testing |
| data-transform | data | JSON/CSV/YAML transforms |
| cron-jobs | automation | Scheduled tasks |
| memory | ai | Persistent memory |
| theme-manager | customization | Theme management |
| model-manager | ai | Provider management |
| user-manager | system | User management |
| macro-recorder | automation | Command sequences |

### Auto-generate skills
```
/skills generate A skill that monitors disk usage and alerts when low
```

---

## 🏗️ Architecture

```
src/
├── index.js              # Main entry point & REPL
├── kernel.js             # Core kernel (event bus, command router, module loader)
├── providers.js          # AI provider abstraction (15+ providers, 300+ models)
├── storage.js            # Encrypted storage engine (AES-256-GCM vault)
├── ui.js                 # Legacy UI (banner, themes, HUD)
├── engine/
│   └── renderer.js       # 3D terminal UI engine (25 themes, animations)
└── modules/
    ├── skillEngine.js    # Skill registry, sandboxing, versioning
    ├── auth.js           # Authentication engine
    ├── memory.js         # Persistent memory
    ├── goals.js          # Goal tracking
    ├── cron.js           # Scheduled tasks
    ├── knowledge.js      # Knowledge engine
    ├── sessions.js       # Session management
    ├── websearch.js      # Web search
    ├── watchdog.js       # Health monitoring
    ├── delegation.js     # Task delegation
    ├── config.js         # Configuration manager
    ├── gateway.js        # API gateway
    ├── mcp.js            # MCP protocol
    ├── chat.js           # Chat rendering
    ├── chatPanel.js      # Chat panel UI
    ├── animations.js     # Animation system
    ├── bootAnimation.js  # Boot sequence
    ├── models.js         # Legacy model router
    └── ...               # 20+ more modules
```

---

## 📊 System Requirements

- **Node.js** ≥ 18.0.0
- **Terminal** with ANSI color support (Windows Terminal, iTerm2, GNOME Terminal, etc.)
- **RAM** ≥ 64MB
- **Disk** ≥ 50MB

### Supported Platforms
- Windows 10/11
- macOS 12+
- Linux (Ubuntu, Fedora, Arch, etc.)
- WSL (Windows Subsystem for Linux)
- Android (Termux)
- Docker / Podman

---

## 🛠️ Development

```bash
# Clone
git clone https://github.com/uthumany/uthy-agentic-os.git
cd uthy-agentic-os

# Install
npm install

# Run
npm start

# Test
npm test

# Info
npm run info
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 🔗 Links

- **GitHub**: [github.com/uthumany/uthy-agentic-os](https://github.com/uthumany/uthy-agentic-os)
- **npm**: [npmjs.com/package/uthy-os](https://www.npmjs.com/package/uthy-os)
- **Author**: [uthuman & co](https://uthuman.com)

---

**Built with ❤️ by uthuman & co**
