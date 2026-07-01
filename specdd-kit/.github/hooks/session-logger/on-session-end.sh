#!/usr/bin/env bash
set -euo pipefail
mkdir -p .specdd/logs
echo "session-end $(date -u +%FT%TZ)" >> .specdd/logs/session.log
