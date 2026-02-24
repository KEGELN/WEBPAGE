#!/usr/bin/env bash
set -euo pipefail

# Generates notification-related env vars and prompts for values
# that cannot be generated automatically.
#
# Usage:
#   ./scripts/generate_notification_env.sh [output_file]
#
# Default output file:
#   .env.notifications

OUTPUT_FILE="${1:-.env.notifications}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' not found in PATH." >&2
    exit 1
  fi
}

prompt_value() {
  local var_name="$1"
  local prompt_text="$2"
  local default_value="${3:-}"
  local value=""

  if [[ -n "$default_value" ]]; then
    read -r -p "$prompt_text [$default_value]: " value
    value="${value:-$default_value}"
  else
    while [[ -z "$value" ]]; do
      read -r -p "$prompt_text: " value
    done
  fi

  printf "%s" "$value"
}

escape_env_value() {
  local raw="$1"
  raw="${raw//\\/\\\\}"
  raw="${raw//\"/\\\"}"
  printf "\"%s\"" "$raw"
}

generate_vapid_keys() {
  local out
  if out="$(npx --yes web-push generate-vapid-keys 2>/dev/null)"; then
    local pub priv
    pub="$(printf "%s\n" "$out" | sed -n 's/^Public Key:[[:space:]]*//p' | head -n1)"
    priv="$(printf "%s\n" "$out" | sed -n 's/^Private Key:[[:space:]]*//p' | head -n1)"
    if [[ -n "$pub" && -n "$priv" ]]; then
      printf "%s\n%s\n" "$pub" "$priv"
      return 0
    fi
  fi
  return 1
}

generate_cron_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
    return 0
  fi

  # Fallback without openssl
  head -c 48 /dev/urandom | base64 | tr -d '\n'
}

require_cmd npx
require_cmd sed
require_cmd head
require_cmd base64

echo "Generating VAPID keys..."
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
if VAPID_KEYS="$(generate_vapid_keys)"; then
  VAPID_PUBLIC_KEY="$(printf "%s\n" "$VAPID_KEYS" | sed -n '1p')"
  VAPID_PRIVATE_KEY="$(printf "%s\n" "$VAPID_KEYS" | sed -n '2p')"
  echo "VAPID keys generated."
else
  echo "Could not auto-generate VAPID keys. Please enter them manually."
  VAPID_PUBLIC_KEY="$(prompt_value "VAPID_PUBLIC_KEY" "VAPID public key")"
  VAPID_PRIVATE_KEY="$(prompt_value "VAPID_PRIVATE_KEY" "VAPID private key")"
fi

echo "Generating cron secret..."
NOTIFICATION_CRON_SECRET="$(generate_cron_secret)"
echo "Cron secret generated."

VAPID_SUBJECT="$(prompt_value "VAPID_SUBJECT" "VAPID subject (example: mailto:admin@example.com)")"
KV_REST_API_URL="$(prompt_value "KV_REST_API_URL" "KV REST API URL (optional, press Enter to skip)" "")"
KV_REST_API_TOKEN="$(prompt_value "KV_REST_API_TOKEN" "KV REST API TOKEN (optional, press Enter to skip)" "")"

{
  echo "VAPID_PUBLIC_KEY=$(escape_env_value "$VAPID_PUBLIC_KEY")"
  echo "VAPID_PRIVATE_KEY=$(escape_env_value "$VAPID_PRIVATE_KEY")"
  echo "VAPID_SUBJECT=$(escape_env_value "$VAPID_SUBJECT")"
  echo "NOTIFICATION_CRON_SECRET=$(escape_env_value "$NOTIFICATION_CRON_SECRET")"
  echo "KV_REST_API_URL=$(escape_env_value "$KV_REST_API_URL")"
  echo "KV_REST_API_TOKEN=$(escape_env_value "$KV_REST_API_TOKEN")"
} > "$OUTPUT_FILE"

echo
echo "Wrote notification env vars to: $OUTPUT_FILE"
echo "Review and copy them into your .env.local / Vercel environment variables."

