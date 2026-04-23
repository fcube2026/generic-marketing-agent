#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# scripts/validate-env.sh
# Validate that environment variables are correctly configured
# for the target environment (staging or production).
#
# Usage:
#   APP_ENV=staging bash scripts/validate-env.sh
#   APP_ENV=production bash scripts/validate-env.sh
# ──────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ENV="${APP_ENV:-development}"
ERRORS=0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 Environment Validation: ${ENV}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_var() {
  local var_name="$1"
  local required="${2:-true}"
  local value="${!var_name:-}"

  if [ -z "$value" ]; then
    if [ "$required" = "true" ]; then
      echo -e "  ${RED}✗${NC} ${var_name} — MISSING (required)"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "  ${YELLOW}○${NC} ${var_name} — not set (optional)"
    fi
  else
    # Mask secrets
    if echo "$var_name" | grep -qiE "SECRET|PASSWORD|KEY"; then
      echo -e "  ${GREEN}✓${NC} ${var_name} — ****"
    else
      echo -e "  ${GREEN}✓${NC} ${var_name} — ${value}"
    fi
  fi
}

check_no_prod_leak() {
  local var_name="$1"
  local value="${!var_name:-}"

  if [ "$ENV" = "staging" ] && [ -n "$value" ]; then
    if echo "$value" | grep -qiE "prod|production"; then
      echo -e "  ${RED}⚠${NC}  WARNING: ${var_name} contains 'prod' — possible production leak!"
      ERRORS=$((ERRORS + 1))
    fi
  fi
}

check_supabase_service_key() {
  local value="${SUPABASE_SERVICE_ROLE_KEY:-}"

  if [ -z "$value" ]; then
    return
  fi

  if echo "$value" | grep -q '^sb_publishable_'; then
    echo -e "  ${RED}✗${NC} SUPABASE_SERVICE_ROLE_KEY is a publishable key — backend storage requires a service-role/secret key"
    ERRORS=$((ERRORS + 1))
    return
  fi

  if echo "$value" | grep -qi 'anon'; then
    echo -e "  ${RED}✗${NC} SUPABASE_SERVICE_ROLE_KEY looks like an anon key — backend storage requires a service-role/secret key"
    ERRORS=$((ERRORS + 1))
    return
  fi

  echo -e "  ${GREEN}✓${NC} SUPABASE_SERVICE_ROLE_KEY — looks like a backend key"
}

echo "── Core ──────────────────────────────────────────"
check_var "APP_ENV" false
check_var "NODE_ENV" false
check_var "PORT" false

echo ""
echo "── Database ──────────────────────────────────────"
check_var "DATABASE_URL" true
check_var "DIRECT_URL" false
check_no_prod_leak "DATABASE_URL"

echo ""
echo "── Auth ──────────────────────────────────────────"
check_var "JWT_SECRET" true
check_var "JWT_EXPIRES_IN" false

echo ""
echo "── CORS ──────────────────────────────────────────"
check_var "CORS_ORIGINS" false

if [ "$ENV" = "staging" ] || [ "$ENV" = "production" ]; then
  echo ""
  echo "── Supabase ──────────────────────────────────────"
  check_var "SUPABASE_URL" false
  check_var "SUPABASE_SERVICE_ROLE_KEY" false
  check_supabase_service_key
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -gt 0 ]; then
  echo -e "  ${RED}✗ ${ERRORS} issue(s) found${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
else
  echo -e "  ${GREEN}✓ All checks passed for ${ENV}${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi
