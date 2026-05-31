# Generate Report

## `aast generate:report <testResultsFile>`

Generates a comprehensive test report from a JSON file containing test results. The report can be generated in various formats.

### Arguments

*   `<testResultsFile>` (required): The path to the JSON file containing the raw test results.

### Options

*   `-f, --format <type>`: The desired output format for the report (e.g., `json`, `markdown`). Defaults to `json`.

### Examples

```bash
aast generate:report ./test-results.json --format markdown
aast generate:report ./api-test-results.json
```
