#!/usr/bin/env bash
set -euo pipefail
mkdir -p .specdd/logs
echo "session-start $(date -u +%FT%TZ)" >> .specdd/logs/session.log
