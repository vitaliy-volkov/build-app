#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
EMAIL="${EMAIL:-}"
PASSWORD="${PASSWORD:-}"

log() {
  printf '\n==> %s\n' "$1"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}

require_cmd curl
require_cmd python3

log "Health checks"
curl -fsS "$BASE_URL/health" >/dev/null
curl -fsS "$BASE_URL/api/v1/health" >/dev/null
curl -fsS "$BASE_URL/api/v1/health/database" >/dev/null

echo "✓ health endpoints are reachable"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "⚠ EMAIL/PASSWORD are not set; auth/project/company checks are skipped"
  exit 0
fi

log "Auth login"
LOGIN_RESPONSE="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"

ACCESS_TOKEN="$(python3 - <<'PY' "$LOGIN_RESPONSE"
import json, sys
obj = json.loads(sys.argv[1])
token = obj.get('data', {}).get('tokens', {}).get('access_token', '')
print(token)
PY
)"

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Login did not return access token" >&2
  exit 1
fi

echo "✓ login returned access token"

log "Protected contract checks"
curl -fsS "$BASE_URL/api/v1/auth/me" -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null
curl -fsS "$BASE_URL/api/v1/projects" -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null
curl -fsS "$BASE_URL/api/v1/companies" -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null

echo "✓ protected endpoints respond correctly"
