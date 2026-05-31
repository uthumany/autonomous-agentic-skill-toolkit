#!/bin/bash

# Example: Run a mobile test on example.com using an iPhone 11 emulation

echo "Running mobile test on example.com with iPhone 11 emulation"
./src/index.js test:mobile https://example.com --device "iPhone 11"

echo "Capturing screenshot of example.com on iPhone 11"
./src/index.js capture:screenshot https://example.com --output examples/example_com_mobile_screenshot.png
