#!/usr/bin/env bash
# Junta todas as migrations versionadas em um único schema.sql, em ordem cronológica.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$ROOT/supabase/migrations"
OUT_DIR="${OUT_DIR:-/tmp/migracao}"
OUT="$OUT_DIR/schema.sql"

mkdir -p "$OUT_DIR"

{
  echo "-- Estrutura consolidada gerada em $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "-- Origem: supabase/migrations"
  echo "begin;"
  echo "create extension if not exists pgcrypto;"
  echo "create extension if not exists \"uuid-ossp\";"
  echo
  for f in $(ls "$SRC"/*.sql | sort); do
    echo "-- ============================================================"
    echo "-- $(basename "$f")"
    echo "-- ============================================================"
    cat "$f"
    echo
    echo
  done
  echo "commit;"
} > "$OUT"

echo "OK -> $OUT"
echo "Arquivos incluidos: $(ls "$SRC"/*.sql | wc -l)"
echo "Tamanho: $(du -h "$OUT" | cut -f1)"
