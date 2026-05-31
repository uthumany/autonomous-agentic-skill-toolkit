#!/bin/bash

# Example: Run a CLI test for a simple command

echo "Running CLI test for 'ls -l'"
./src/index.js test:cli "ls -l"
