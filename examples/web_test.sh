#!/bin/bash

# Example: Run a web test and capture a screenshot

echo "Running web test on example.com"
./src/index.js test:web https://example.com

echo "Capturing screenshot of example.com"
./src/index.js capture:screenshot https://example.com --output examples/example_com_screenshot.png
