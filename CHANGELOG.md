# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-01

### Added

#### Improvements

1. **Smart Test Flakiness Detection & Self-Healing** (`src/modules/flakiness.js`)
   - Runs each test case multiple times across identical environments
   - Compares pass/fail outcomes, execution timing, and DOM selector resolution
   - Calculates flakiness score per test (0 = stable, 1 = completely flaky)
   - Self-healing strategies: CSS-to-data-testid selector swapping, dynamic wait injection (networkidle/domcontentloaded), exponential backoff retry
   - Generates stabilization patch recommendations
   - CLI: `aast test:flakiness <url> --iterations 5 --heal`

2. **Parallel Execution Engine with Resource Pooling** (`src/modules/parallel.js`)
   - Central dispatcher with live browser/viewport/device resource pool
   - Task queue with priority-based scheduling
   - Worker management with resource affinity (browser, mobile, desktop)
   - Automatic crash detection and browser context respawn
   - Resource cap enforcement per worker to prevent memory exhaustion
   - Real-time result streaming with unified report generation
   - CLI: `aast run:parallel <testSuiteDir> --workers 4 --urls "url1,url2,url3"`

3. **Intelligent Baseline Comparison for Visual Regression** (`src/modules/visual_regression.js`)
   - Baseline screenshot library tagged by viewport, device, and OS
   - Perceptual diff pipeline: pixel-level comparison + block-based structural similarity index
   - Three-bucket categorization: expected dynamic content, acceptable noise (anti-aliasing), critical regressions
   - Critical regressions block the pipeline; acceptable differences flagged for review
   - Multi-viewport testing with configurable device configurations
   - CLI: `aast test:visual <url> --update-baseline` / `aast visual:update-baseline <url>`

#### Features

4. **AI-Powered Test Oracle & Assertion Generator** (`src/modules/oracle.js`)
   - Exploratory crawl recording: DOM mutations, API response schemas, user interaction sequences
   - Heuristic invariant inference engine:
     - API status/schema invariants (endpoint always returns X, consistent schema)
     - Form invariants (required fields, action/method patterns)
     - Page structure invariants (headings, enabled buttons)
     - Accessibility invariants (missing alt text, missing H1)
     - Error invariants (API errors, console errors)
     - Content invariants (blank pages, broken images)
   - Auto-generates executable test scripts in the toolkit's native format
   - Confidence scoring per assertion with configurable threshold
   - CLI: `aast generate:assertions <url> --min-confidence 0.5`

5. **Cross-Platform Session Replay with DOM State Serialization** (`src/modules/session_replay.js`)
   - Full-fidelity trace capture: serialized DOM snapshots, HAR-style network logs, console/error streams, performance timeline
   - `.aastreplay` compressed file format (gzip JSON)
   - Browser-based replay viewer with:
     - Timeline scrubbing with keyboard shortcuts (←→ Space)
     - DOM element overlay visualization
     - Network request/response inspection
     - Console log viewer with error highlighting
     - Performance metrics panel (navigation timing, paint, resources)
     - Auto-play with configurable speed
   - CLI: `aast record:trace <url> -d 10` / `aast replay:view <trace.aastreplay>`

6. **Dynamic Environment Provisioning with Infrastructure-as-Test-Code** (`src/modules/provisioner.js`)
   - Reads `environment.yaml` manifest (services, stubs, seeds, network)
   - Docker container management: pull, run, port mapping, env injection
   - Health check verification (HTTP endpoint + TCP port)
   - WireMock/Mountebank stub support
   - SQL/Script seed execution
   - Cascading teardown with container log archiving
   - `.env` file generation for test runners
   - Dry-run mode for manifest validation
   - CLI: `aast provision <testDir>` / `aast provision --dry-run <testDir>` / `aast provision:teardown`

### Changed

- Upgraded `package.json` to version 0.2.0
- Added new dependencies: `pngjs` (visual regression PNG handling), `js-yaml` (YAML manifest parsing)
- Updated CLI with 10 new commands across all 6 new modules
- Added 64 unit tests across 17 test suites

## [0.1.0] - 2026-05-31

### Added

- Initial release with core testing modules
- Web testing (Playwright chromium)
- Mobile testing (WebKit device emulation)
- Desktop testing (placeholder)
- CLI testing (child_process exec)
- API testing (axios HTTP requests)
- Accessibility testing (axe-core integration)
- Performance testing (Lighthouse)
- Screenshot capture and video recording
- Report generation (JSON/Markdown)
- Fix prompt generation
- CLI interface via Commander.js
- GitHub Actions CI workflow
