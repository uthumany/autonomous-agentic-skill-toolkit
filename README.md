# Autonomous Agentic Skill Toolkit

## Overview

This project aims to create an open-source autonomous testing skill toolkit for web apps, mobile apps, desktop apps, CLI tools, and IDE workflows. It will run checks, capture evidence, and generate fix prompts without manual intervention.

## Core Features

*   **Frontend UI/UX validation**
*   **Backend/API verification**
*   **Form filling and auth flow testing**
*   **Responsive live preview** for mobile, tablet, and desktop
*   **Screenshot and video evidence capture**
*   **Accessibility, performance, and SEO audit pass**
*   **Error analysis and fix-prompt generation**
*   **Report export** for PRs, issues, and release notes
*   **Multi-app coverage**: web, mobile, desktop, CLI, and IDE-adjacent flows

## Dependencies & Prerequisites

*   **Git**: For cloning the repository.
*   **Node.js** (LTS version recommended): For running the CLI tool and managing dependencies.
*   **Python 3**: For potential future API probes, parsing, and report generation scripts.
*   **Docker**: For portable local runners and reproducible environments (optional, but recommended).
*   **FFmpeg**: For video capture and media packaging.
*   **Android platform-tools (adb)**: Required for mobile testing on Android devices.
*   **Browser Engines**: Chromium/Chrome for Playwright and Lighthouse workflows. These will be installed automatically by Playwright.

## Installation

```bash
# Clone the repository
git clone https://github.com/uthumany/autonomous-agentic-skill-toolkit.git
cd autonomous-agentic-skill-toolkit

# Install Node.js dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps

# (Optional) Create a global alias for convenience
echo 'alias aast="$(pwd)/src/index.js"' >> ~/.bashrc # For Bash
source ~/.bashrc
# Or for Zsh:
echo 'alias aast="$(pwd)/src/index.js"' >> ~/.zshrc # For Zsh
source ~/.zshrc
```

## Usage

### Basic Commands

*   **Run Web Test**:
    ```bash
    aast test:web https://example.com
    ```
*   **Run Mobile Test**:
    ```bash
    aast test:mobile https://example.com --device "iPhone 11"
    ```
*   **Run Desktop Test**:
    ```bash
    aast test:desktop "MyDesktopApp"
    ```
*   **Run CLI Test**:
    ```bash
    aast test:cli "ls -l"
    ```
*   **Run API Test**:
    ```bash
    aast test:api https://jsonplaceholder.typicode.com/todos/1 -m GET
    aast test:api https://jsonplaceholder.typicode.com/posts -m POST -d '{"title": "foo", "body": "bar", "userId": 1}'
    ```
*   **Run Accessibility Test**:
    ```bash
    aast test:accessibility https://example.com
    ```
*   **Run Performance Test**:
    ```bash
    aast test:performance https://example.com
    ```
*   **Capture Screenshot**:
    ```bash
    aast capture:screenshot https://example.com -o output.png
    ```
*   **Record Video**:
    ```bash
    aast record:video https://example.com -o output.webm -d 10
    ```
*   **Generate Report**:
    ```bash
    aast generate:report ./test-results.json -f json
    ```
*   **Generate Fix Prompt**:
    ```bash
    aast generate:fix-prompt ./error-details.json
    ```

## Integrations

This toolkit will leverage the following open-source tools and public APIs:

### Open-Source Tools (no authentication required)

- **Playwright**: For screenshots, video recording, authentication state reuse, and mobile/tablet/desktop emulation.
- **Selenium**: For cross-browser automation through WebDriver.
- **Appium**: For mobile, browser, desktop, and TV automation.
- **Lighthouse**: For performance, accessibility, PWA, and SEO audits.
- **axe-core**: For automated accessibility testing in HTML-based UIs.
- **FFmpeg**: For recording, inspecting, and transcoding media evidence.
- **Android Debug Bridge (adb)**: For Android install, debug, shell, and device actions.

### Public API Endpoints (no authentication required)

- **Open-Meteo**: Weather forecast data.
- **Wikimedia Action API**: Public read endpoints for search and parsing.
- **Open Library Search API**: Book discovery and lookup.
- **JSONPlaceholder**: Free fake REST data for testing.
- **REST Countries**: Open-source country data API.
- **PokéAPI**: Pokémon data.
- **Dog CEO API**: Public image endpoint.

## GitHub Setup

- Public repository name: `autonomous-agentic-skill-toolkit`
- Core files: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`
- Project folders: `src/`, `examples/`, `docs/`, `tests/`, `.github/workflows/`
- CI: GitHub Actions for lint, unit tests, integration tests, packaging, and release checks.
- Discoverability: repository topics, concise description, and release tags.
- Release flow: tag-driven releases with packaged artifacts and notes.
- Branch safety: protect `main` with required checks and PR review gates.
- README structure: use headings for automatic table of contents generation.
- Open-source posture: public repo, contribution guidelines, code of conduct, and security policy.

## MVP Terms

- **v0.1**: Web-first automation, login/forms, screenshots, video, accessibility scan, fix-prompt report.
- **v0.2**: Mobile emulation, real-device Android bridge, device presets.
- **v0.3**: Desktop app hooks, CLI adapters, richer report bundles.
- **v1.0**: Plugin system, CI automation, release packaging, evidence archive, prompt templates.

## Terminal ASCII Art Design Principles

- Monospace only
- 80-column safe
- Boxed sections and clear hierarchy
- Copy-safe output with no hidden formatting dependency
- Optional ANSI color, never required
- Status-first labels: PASS, FAIL, WARN, INFO
- Compact summaries before deep logs
- Machine-readable fallback in JSON and Markdown
- Works cleanly in Bash, Zsh, Fish, PowerShell, Command Prompt, Tmux, Screen, and terminal IDE panels
