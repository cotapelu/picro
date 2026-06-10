#!/bin/bash
set -e

mkdir -p coverage

# Get all test files
test_files=$(find src -name "*.test.ts" -o -name "*.test.tsx")

for f in $test_files; do
    echo "Running $f"
    output_file="coverage/$(echo $f | sed 's|/|_|g').json"
    npx vitest run --coverage --reporter=json "$f" > "$output_file" 2>&1 || exit 1
done

echo "All tests completed!"
