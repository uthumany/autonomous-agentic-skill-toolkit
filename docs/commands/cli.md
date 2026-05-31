# CLI Testing

## `aast test:cli <command>`

Executes a specified command in the terminal and captures its output. This is useful for testing command-line tools and scripts.

### Arguments

*   `<command>` (required): The CLI command to execute, enclosed in quotes.

### Examples

```bash
aast test:cli "ls -l"
aast test:cli "node --version"
```
