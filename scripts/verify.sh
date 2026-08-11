#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VisionStream — full verification suite
# Run from the repo root:  npm run verify   (or)   bash scripts/verify.sh
# Requires: chromium installed once via `npx playwright install chromium`.
# ─────────────────────────────────────────────────────────────────────────────
set -u
cd "$(dirname "$0")/.." || exit 1

GREEN=$'\e[32m'; RED=$'\e[31m'; DIM=$'\e[2m'; BOLD=$'\e[1m'; RESET=$'\e[0m'
pass=0; fail=0; results=()

step() {
  local name="$1"; shift
  echo "${BOLD}▶ ${name}${RESET}"
  if "$@"; then
    results+=("${GREEN}PASS${RESET}  ${name}"); pass=$((pass+1))
  else
    results+=("${RED}FAIL${RESET}  ${name}"); fail=$((fail+1))
  fi
  echo ""
}

tc_core() { npx tsc --noEmit; }
tc_pg()   { ( cd playground && npx tsc -b ); }
jest_one(){ npx jest "$1" --runInBand --forceExit; }

api_http_layer() {
  PORT=4599 NODE_ENV= npx tsx src/server.ts >/tmp/vs_api.log 2>&1 &
  local pid=$!
  for _ in $(seq 1 40); do
    curl -s -o /dev/null "http://localhost:4599/" && break
    sleep 0.5
  done
  local health rc401
  health=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4599/")
  rc401=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:4599/observe" \
    -H "Content-Type: application/json" -d '{"url":"https://example.com"}')
  echo "  GET  /         -> ${health} ${DIM}(expect 200)${RESET}"
  echo "  POST /observe  -> ${rc401} ${DIM}(expect 401, no key)${RESET}"
  kill "$pid" 2>/dev/null
  [ "$health" = "200" ] && [ "$rc401" = "401" ]
}

echo ""
echo "${BOLD}VisionStream verification${RESET}  ${DIM}$(date)${RESET}"
echo ""

step "Typecheck — core (tsc --noEmit)"                 tc_core
step "Typecheck — playground (tsc -b)"                 tc_pg
step "Unit — URL validation + auth middleware"         jest_one validation.unit.test.ts
step "Unit — SSRF guard (private-IP blocking)"         jest_one ssrf.unit.test.ts
step "Unit — plan quota math"                          jest_one plans.unit.test.ts
step "Unit — cleanPage heuristics (jsdom)"             jest_one cleanPage.test.ts
step "Integration — Observe engine (local fixture)"    jest_one observe.integration.ts
step "Integration — token reduction (live sites)"      jest_one capture.integration.ts
step "Smoke — MCP server"                              jest_one mcp.smoke.ts
step "API — HTTP layer (health + 401)"                 api_http_layer

echo "${BOLD}────────────── Summary ──────────────${RESET}"
for r in "${results[@]}"; do echo "  $r"; done
echo ""
echo "  ${GREEN}${pass} passed${RESET} · ${RED}${fail} failed${RESET}"
echo ""
[ "$fail" -eq 0 ]
