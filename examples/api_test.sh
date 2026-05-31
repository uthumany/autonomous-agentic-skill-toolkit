#!/bin/bash

# Example: Run an API test against JSONPlaceholder

echo "Running GET API test on JSONPlaceholder /todos/1"
./src/index.js test:api https://jsonplaceholder.typicode.com/todos/1

echo "Running POST API test on JSONPlaceholder /posts"
./src/index.js test:api https://jsonplaceholder.typicode.com/posts -m POST -d '{"title": "foo", "body": "bar", "userId": 1}'
