#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/probe_sportwinner_endpoints.sh
#   BASE_URL=http://127.0.0.1:3000/api/sportwinner bash scripts/probe_sportwinner_endpoints.sh
#   BASE_URL=https://skvb.sportwinner.de/php/skvb/service.php bash scripts/probe_sportwinner_endpoints.sh

BASE_URL="${BASE_URL:-http://127.0.0.1:3000/api/sportwinner}"
TIMEOUT="${TIMEOUT:-20}"

req() {
  local name="$1"
  local body="$2"
  echo
  echo "=== $name ==="
  echo "POST $BASE_URL"
  echo "body: $body"
  if ! out="$(curl -sS --max-time "$TIMEOUT" "$BASE_URL" \
    -H 'content-type: application/x-www-form-urlencoded; charset=UTF-8' \
    --data-raw "$body")"; then
    echo "request failed"
    return 1
  fi
  echo "$out" | head -c 1000
  echo
}

echo "BASE_URL=$BASE_URL"

req "GetSaisonArray" "command=GetSaisonArray"
req "GetLigaArray" "command=GetLigaArray&id_saison=11&id_bezirk=0&favorit=&art=1"
req "GetSpielplan" "command=GetSpielplan&id_saison=11&id_liga=3870"
req "GetSpiel" "command=GetSpiel&id_saison=11&id_klub=0&id_bezirk=0&id_liga=3870&id_spieltag=0&favorit=&art_bezirk=1&art_liga=0&art_spieltag=0"
req "GetSpielerInfo_wertung_1" "command=GetSpielerInfo&id_saison=5&id_spiel=132490&wertung=1"
req "GetSpielerInfo_wertung_0" "command=GetSpielerInfo&id_saison=5&id_spiel=132490&wertung=0"
req "GetBahnanlage" "command=GetBahnanlage&id_saison=11"
req "GetSpieltagBester" "command=GetSpieltagBester&id_saison=11&id_liga=3870&id_spieltag=0"
req "GetRekord" "command=GetRekord&id_saison=11&id_liga=3870&id_spieltag=0"

echo
echo "done"
