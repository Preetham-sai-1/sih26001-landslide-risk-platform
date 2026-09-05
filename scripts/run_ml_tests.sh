#!/usr/bin/env bash
# scripts/run_ml_tests.sh
# Runs the ml-service test suite reproducibly, from any working
# directory. Does not change test logic or assertions.
set -euo pipefail
cd "$(dirname "$0")/../ml-service"
python3 -m pytest tests/ -v
