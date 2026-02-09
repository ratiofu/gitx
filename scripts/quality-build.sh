#!/usr/bin/env bash

# Use checks for build (excluding tests)
./scripts/pnpm-parallel.sh "lint:fix" "typecheck" "reqcheck"
