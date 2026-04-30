#!/bin/sh
set -e

# Check current alembic state
CURRENT=$(uv run alembic current 2>&1 || echo "none")
echo "Current alembic revision: $CURRENT"

if echo "$CURRENT" | grep -qE "ef26b80eb21b|37cc5785766a"; then
  # Already versioned — just upgrade (no-op if at head)
  echo "Alembic already initialized, upgrading..."
else
  # No version recorded: DB has tables from before Alembic was set up.
  # Stamp initial schema so Alembic knows those tables already exist.
  echo "No alembic version found. Stamping initial schema..."
  uv run alembic stamp ef26b80eb21b
fi

uv run alembic upgrade head
echo "Migrations done. Starting server..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
