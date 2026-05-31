# Generate Fix Prompt

## `aast generate:fix-prompt <errorDetailsFile>`

Generates a natural language prompt for developers to fix issues, based on a JSON file containing error details. This leverages AI to suggest potential solutions or areas of investigation.

### Arguments

*   `<errorDetailsFile>` (required): The path to the JSON file containing detailed error information.

### Examples

```bash
aast generate:fix-prompt ./web-test-errors.json
```
