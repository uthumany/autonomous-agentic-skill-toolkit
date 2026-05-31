---
name: autonomous-agentic-skill-toolkit
description: "An open-source toolkit for autonomous agentic testing across web, mobile, desktop, CLI, and IDE environments. Automates UI/UX and backend tests, fills forms, handles authentication flows, records screenshots and videos, supports responsive device previews, detects errors, and generates fix prompts and reports for developers. Cross-platform, modular, installable, and ready for GitHub with clear documentation, examples, and CI."
---

# Autonomous Agentic Skill Toolkit

This skill provides a comprehensive set of tools for autonomous agentic testing, enabling automated validation and auditing across various application types. It is designed to integrate seamlessly into developer workflows, providing actionable insights and evidence for quality assurance.

## Features

*   **Multi-Platform Testing**: Supports web, mobile, desktop, CLI, and IDE testing.
*   **Automated UI/UX and Backend Tests**: Conducts comprehensive tests for both frontend and backend functionalities.
*   **Form Filling & Auth Flows**: Automates complex user interactions, including form submissions and authentication processes.
*   **Rich Evidence Capture**: Records screenshots and videos of test runs for detailed analysis and bug reproduction.
*   **Responsive Design Testing**: Provides device previews to ensure applications are responsive across different form factors.
*   **Error Detection & Fix Prompts**: Identifies errors and generates AI-assisted prompts to guide developers toward solutions.
*   **Comprehensive Reporting**: Generates detailed reports suitable for pull requests, issue tracking, and release notes.
*   **Cross-Platform & Modular**: Built for flexibility and extensibility, with a modular architecture.
*   **Installable & GitHub Ready**: Designed for easy installation and deployment, with pre-configured GitHub setup and CI.

## Usage

To use this skill, you will interact with its command-line interface (CLI) through the `aast` executable. The CLI provides various commands for different testing scenarios.

### Installation

First, ensure you have cloned the repository and installed its dependencies as described in the `docs/getting-started.md` file.

### Available Commands

Refer to the `docs/commands.md` for a complete list of commands and their usage. Below are some common commands:

*   `aast test:web <url>`: Run web tests.
*   `aast test:mobile <url> --device "iPhone 11"`: Run mobile tests with device emulation.
*   `aast test:desktop <appName>`: Run desktop application tests.
*   `aast test:cli "<command>"`: Run CLI command tests.
*   `aast test:api <url> -m POST -d '{"key": "value"}'`: Run API tests.
*   `aast test:accessibility <url>`: Run accessibility audits.
*   `aast test:performance <url>`: Run performance audits.
*   `aast capture:screenshot <url> -o output.png`: Capture a screenshot.
*   `aast record:video <url> -o output.webm -d 10`: Record a video.
*   `aast generate:report <testResultsFile> -f json`: Generate a test report.
*   `aast generate:fix-prompt <errorDetailsFile>`: Generate a fix prompt from error details.

## Bundled Resources

This skill includes the following bundled resources:

*   `src/`: The core source code for the CLI tool and its modules.
*   `examples/`: Example scripts demonstrating how to use various commands.
*   `docs/`: Comprehensive documentation for setup, commands, and contribution guidelines.
*   `.github/workflows/`: GitHub Actions workflows for continuous integration.

For detailed information on each module and its functionality, refer to the respective files within the `src/modules/` directory.
