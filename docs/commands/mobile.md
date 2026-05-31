# Mobile Testing

## `aast test:mobile <url>`

Runs automated mobile tests on a specified URL using Playwright with device emulation. This command navigates to the URL, emulates a mobile device, takes a screenshot, and performs basic checks.

### Arguments

*   `<url>` (required): The URL of the web application to test.

### Options

*   `-d, --device <type>`: The name of the device to emulate (e.g., "iPhone 11", "Pixel 2"). Defaults to "iPhone 11".

### Examples

```bash
aast test:mobile https://example.com --device "iPhone 11"
aast test:mobile https://example.com --device "Pixel 2"
```
