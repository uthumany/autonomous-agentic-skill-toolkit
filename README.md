# Autonomous Agentic Skill Toolkit

> Open-source autonomous testing toolkit with flakiness detection, parallel execution, visual regression, AI test oracle, session replay, and environment provisioning.

[![CI](https://github.com/uthumany/autonomous-agentic-skill-toolkit/actions/workflows/node.js.yml/badge.svg)](https://github.com/uthumany/autonomous-agentic-skill-toolkit/actions)
[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/uthumany/autonomous-agentic-skill-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Features

### Core Testing
- **Multi-Platform Testing**: Web, mobile, desktop, CLI, and IDE testing
- **Automated UI/UX and Backend Tests**: Comprehensive frontend + backend validation
- **Form Filling & Auth Flows**: Complex user interaction automation
- **Rich Evidence Capture**: Screenshots and video recording of test runs
- **Responsive Design Testing**: Device previews across form factors
- **Error Detection & Fix Prompts**: AI-assisted developer guidance
- **Comprehensive Reporting**: JSON and Markdown report generation

### New in v0.2.0

#### Improvements

1. **Smart Test Flakiness Detection & Self-Healing** - Runs tests multiple times, detects non-deterministic behavior, and auto-applies healing strategies (selector swapping, dynamic waits, retry backoff)

2. **Parallel Execution Engine with Resource Pooling** - Central dispatcher with browser/device resource pools, priority queues, worker management, crash recovery, and real-time streaming

3. **Intelligent Visual Regression Testing** - Baseline screenshot library with perceptual diff pipeline (pixel-level + SSIM), categorized into dynamic content, noise, and critical regressions

#### Features

4. **AI-Powered Test Oracle** - Exploratory crawl + heuristic inference engine that auto-generates test assertions from DOM mutations, API schemas, and interaction patterns

5. **Cross-Platform Session Replay** - Full-fidelity trace capture (.aastreplay format) with browser-based viewer: timeline scrubbing, DOM overlays, network inspection, console logs, performance metrics

6. **Dynamic Environment Provisioning** - Infrastructure-as-Test-Code via `environment.yaml` manifests: Docker containers, WireMock/Mountebank stubs, seed scripts, health checks, cascading teardown

## Installation

```bash
# Clone the repository
git clone https://github.com/uthumany/autonomous-agentic-skill-toolkit.git
cd autonomous-agentic-skill-toolkit

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Quick Start

```bash
# Run a web test
aast test:web https://example.com

# Check for flaky tests (run 5 times, auto-heal if flaky)
aast test:flakiness https://example.com --iterations 5 --heal

# Run tests in parallel
aast run:parallel ./tests --workers 4 --urls "https://example.com,https://httpbin.org"

# Visual regression test
aast test:visual https://example.com --update-baseline
aast test:visual https://example.com  # Compare against baseline

# Auto-generate test assertions
aast generate:assertions https://example.com --min-confidence 0.5

# Record and replay a session
aast record:trace https://example.com -d 10
aast replay:view ./aast-traces/trace_xxx.aastreplay

# Provision test environment
aast provision ./test-dir  # Reads environment.yaml
aast provision --dry-run ./test-dir  # Preview without provisioning
```

## All Commands

### Testing
| Command | Description |
|---------|-------------|
| `aast test:web <url>` | Run web tests |
| `aast test:mobile <url> -d "iPhone 11"` | Run mobile tests with device emulation |
| `aast test:desktop <appName>` | Run desktop application tests |
| `aast test:cli "<command>"` | Run CLI command tests |
| `aast test:api <url> -m POST -d '{}'` | Run API tests |
| `aast test:accessibility <url>` | Run accessibility audits |
| `aast test:performance <url>` | Run Lighthouse performance tests |
| `aast test:flakiness <url>` | Flakiness detection across iterations |
| `aast test:visual <url>` | Visual regression against baselines |

### Generation & Recording
| Command | Description |
|---------|-------------|
| `aast generate:assertions <url>` | Auto-generate test assertions |
| `aast generate:report <file> -f json` | Generate test reports |
| `aast generate:fix-prompt <file>` | Generate fix prompts from errors |
| `aast record:trace <url>` | Record session trace |
| `aast record:video <url>` | Record video |
| `aast capture:screenshot <url>` | Capture screenshot |

### Execution & Provisioning
| Command | Description |
|---------|-------------|
| `aast run:parallel <dir>` | Run test suite in parallel |
| `aast provision <dir>` | Provision test environment |
| `aast provision --dry-run <dir>` | Preview provisioning |
| `aast provision:teardown` | Tear down environments |
| `aast replay:view <file>` | View session replay |

## Environment Manifest

Create an `environment.yaml` in your test directory:

```yaml
version: "1.0"
network: "aast-test-net"

services:
  - name: postgres
    image: postgres:15
    ports: ["5432:5432"]
    env:
      POSTGRES_DB: testdb
      POSTGRES_PASSWORD: secret
    healthcheck: "http://localhost:5432/health"

  - name: redis
    image: redis:7-alpine
    ports: ["6379:6379"]

stubs:
  - name: weather-api
    type: wiremock
    mappings: ./stubs/weather

seed:
  - name: init-db
    type: sql
    file: ./seeds/init.sql
    target: postgres
```

## Project Structure

```
autonomous-agentic-skill-toolkit/
├── src/
│   ├── index.js                  # CLI entry point (25+ commands)
│   └── modules/
│       ├── flakiness.js          # Flakiness detection & self-healing
│       ├── parallel.js           # Parallel execution engine
│       ├── visual_regression.js  # Visual regression testing
│       ├── oracle.js             # AI test oracle & assertion generator
│       ├── session_replay.js     # Session replay & .aastreplay format
│       ├── provisioner.js        # Environment provisioning
│       ├── web.js                # Web testing
│       ├── mobile.js             # Mobile testing
│       ├── desktop.js            # Desktop testing
│       ├── cli.js                # CLI testing
│       ├── api.js                # API testing
│       ├── accessibility.js      # Accessibility testing
│       ├── performance.js        # Performance testing
│       ├── evidence.js           # Screenshot & video capture
│       ├── report.js             # Report generation
│       └── fix_prompt.js         # Fix prompt generation
├── tests/                        # 64 unit tests
│   ├── flakiness.test.js
│   ├── parallel.test.js
│   ├── visual_regression.test.js
│   ├── oracle.test.js
│   ├── session_replay.test.js
│   └── provisioner.test.js
├── examples/                     # Example test scripts
├── docs/                         # Documentation
└── package.json
```

## Running Tests

```bash
# Run all tests (64 tests, ~4 seconds)
node --test tests/*.test.js

# Run a specific module's tests
node --test tests/parallel.test.js
```

## License

MIT License - see [LICENSE](LICENSE) for details.
