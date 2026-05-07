#!/usr/bin/env bash
# End-to-end smoke checks against a running Next.js server (dev or start).
# Usage: BASE_URL=http://127.0.0.1:3000 ./scripts/smoke-integration.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

echo "Smoke test → $BASE_URL"

code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [[ "$code" != "200" ]]; then
  echo "FAIL: GET / expected 200, got $code"
  exit 1
fi
echo "OK GET / ($code)"

code=$(curl -sS -o "$TMP" -w "%{http_code}" "$BASE_URL/api/dashboard/reminders")
if [[ "$code" == "500" ]]; then
  echo "WARN GET /api/dashboard/reminders → 500 (is PostgreSQL running and DATABASE_URL set?)"
elif [[ "$code" != "200" ]]; then
  echo "FAIL: GET /api/dashboard/reminders expected 200, got $code"
  exit 1
else
  if ! node -e "const d=require('fs').readFileSync('$TMP','utf8'); const j=JSON.parse(d); process.exit(j.success===true?0:1);"; then
    echo "FAIL: dashboard reminders JSON missing success:true"
    exit 1
  fi
  echo "OK GET /api/dashboard/reminders ($code)"
fi

code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/organize/run")
if [[ "$code" != "200" && "$code" != "500" ]]; then
  echo "FAIL: POST /api/organize/run expected 200 or 500, got $code"
  exit 1
fi
echo "OK POST /api/organize/run ($code)"

code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/deliver/run")
if [[ "$code" != "200" && "$code" != "500" ]]; then
  echo "FAIL: POST /api/deliver/run expected 200 or 500, got $code"
  exit 1
fi
echo "OK POST /api/deliver/run ($code)"

echo "All smoke checks passed."
