#!/usr/bin/env bash
# scripts/setup_ml_service.sh
# Creates a local Python venv and installs ml-service's exact pinned
# dependencies. Does not change any application code or behavior.
set -euo pipefail
cd "$(dirname "$0")/../ml-service"
python3 -m venv .venv
source .venv/bin/activate
pip install --no-cache-dir -r requirements.txt
echo "ml-service environment ready. Activate with: source ml-service/.venv/bin/activate"
