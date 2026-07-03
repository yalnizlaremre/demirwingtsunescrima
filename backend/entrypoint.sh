#!/bin/sh
set -e

# SQLite (dev): schema is created/migrated in-process by app/main.py's lifespan.
# PostgreSQL (production): apply Alembic migrations before starting the server.
case "$DATABASE_URL" in
  sqlite*) ;;
  *) alembic upgrade head ;;
esac

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
