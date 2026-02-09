#!/usr/bin/env bash

# Use the same checks as the old quality script
./scripts/pnpm-parallel.sh "lint:fix" "typecheck" "test" "reqcheck"
