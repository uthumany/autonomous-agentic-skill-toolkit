# Getting Started

This guide will help you set up and start using the Autonomous Agentic Skill Toolkit.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Git**: For cloning the repository.
*   **Node.js** (LTS version recommended): For running the CLI tool and managing dependencies.
*   **Python 3**: For potential future API probes, parsing, and report generation scripts.
*   **Docker**: For portable local runners and reproducible environments (optional, but recommended).
*   **FFmpeg**: For video capture and media packaging.
*   **Android platform-tools (adb)**: Required for mobile testing on Android devices.
*   **Browser Engines**: Chromium/Chrome for Playwright and Lighthouse workflows. These will be installed automatically by Playwright.

## Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/your-username/autonomous-agentic-skill-toolkit.git
    cd autonomous-agentic-skill-toolkit
    ```

2.  **Install Node.js dependencies**:

    ```bash
    npm install
    ```

3.  **Install Playwright browsers**:

    ```bash
    npx playwright install --with-deps
    ```

## Usage

The toolkit provides a command-line interface (CLI) accessible via `./src/index.js` or by creating a global alias. For convenience, you can add an alias to your shell configuration (e.g., `~/.bashrc`, `~/.zshrc`):

```bash
alias aast="/path/to/your/autonomous-agentic-skill-toolkit/src/index.js"
```

Replace `/path/to/your/autonomous-agentic-skill-toolkit` with the actual path to your cloned repository.

### Basic Commands

*   **Run Web Test**: `aast test:web <url>`
*   **Run Mobile Test**: `aast test:mobile <url> --device "iPhone 11"`
*   **Run Desktop Test**: `aast test:desktop <appName>`
*   **Run CLI Test**: `aast test:cli "ls -l"`
*   **Run API Test**: `aast test:api <url> -m GET`
*   **Run Accessibility Test**: `aast test:accessibility <url>`
*   **Run Performance Test**: `aast test:performance <url>`
*   **Capture Screenshot**: `aast capture:screenshot <url> -o output.png`
*   **Record Video**: `aast record:video <url> -o output.webm -d 10`
*   **Generate Report**: `aast generate:report <testResultsFile> -f json`
*   **Generate Fix Prompt**: `aast generate:fix-prompt <errorDetailsFile>`

For detailed information on each command and its options, refer to the [Commands](commands.md) section.
