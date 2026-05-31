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

Replace `/path/to/your/autonomous-agentic-skill-toolkit` with the actual path to your cloned repository.

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

For detailed information on each command and its options, refer to the [Commands](commands.md) section.
