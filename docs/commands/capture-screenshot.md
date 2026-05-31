# Capture Screenshot

## `aast capture:screenshot <url>`

Captures a screenshot of a given URL. This is useful for visual regression testing or documenting UI states.

### Arguments

*   `<url>` (required): The URL of the page to capture.

### Options

*   `-o, --output <path>`: The output path for the screenshot file. Defaults to `screenshot.png`.

### Examples

```bash
aast capture:screenshot https://example.com -o my_app_homepage.png
```
