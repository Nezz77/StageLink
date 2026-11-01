#!/bin/sh
# Run from repository root. Explicit isolated test infrastructure only.
set -eu
export NODE_ENV=test
export DATABASE_URL='postgresql://stagelink:local-test-only@127.0.0.1:55433/stagelink_test?connect_timeout=3'
export REDIS_URL='redis://127.0.0.1:56380'
docker compose -f infra/compose.test.yml up -d --wait
npm --prefix backend run db:generate
npm --prefix backend run db:migrate
npm --prefix backend run db:migrate
npm --prefix backend run test:integration
# Leave services available for inspection. Stop them with compose down when done.
