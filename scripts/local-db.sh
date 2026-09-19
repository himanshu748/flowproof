#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local
if [ ! -d .local/pgdata ]; then initdb -D .local/pgdata -A trust --no-locale -E UTF8 >/dev/null; fi
if ! pg_ctl -D .local/pgdata status >/dev/null 2>&1; then pg_ctl -D .local/pgdata -l .local/postgres.log -o "-p 55439 -h 127.0.0.1 -k /tmp" start; fi
if ! psql -h 127.0.0.1 -p 55439 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='flowproof'" | rg -q 1; then createdb -h 127.0.0.1 -p 55439 flowproof; fi
