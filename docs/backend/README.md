# StageLink backend

Implementation branch: `backend`, isolated from the existing frontend `main` checkout. Start with [the full plan](StageLink-Backend-Implementation-Plan.md), [decisions](ADR-001-foundation.md), [backlog](backend-backlog.json), [UI coverage](UI-Backend-Coverage.csv) and [progress](PROGRESS.md).

P01 adds infrastructure, not production accounts/bookings/payments. The frontend still uses its existing demo state. P02 authentication is next; each feature switches to authorized persisted data in the phase listed in the backlog. Nothing is seeded into production automatically.

## Local setup with Docker

From the repository root:

```sh
cp infra/.env.example infra/.env
# Local-only credentials; replace before any shared/hosted environment.
docker compose --env-file infra/.env -f infra/compose.backend.yml up --build -d --wait
```

This boots a separate `stagelink-backend` project, PostgreSQL, Redis, a one-shot migrator, API, worker and internal AI shell. Migrations must succeed before API/worker start. Host ports bind loopback only: API 4000, PostgreSQL 55432, Redis 56379. There is no public AI port. Optional existing demo frontend container:

```sh
docker compose --env-file infra/.env -f infra/compose.backend.yml --profile web up --build -d web
```

Open `http://localhost:3000` for the existing demo UI, `http://localhost:4000/api/docs` for local API docs, and `/api/v1/health/live` or `/api/v1/health/ready` for probes. Health-only AI docs are internal. P01 deliberately exposes no user/business mutation endpoint.

```sh
# Commit a harmless internal diagnostic event. Worker consumes it transactionally.
docker compose --env-file infra/.env -f infra/compose.backend.yml exec api npm run outbox:ping
# Verify the corresponding receipt (not merely successful enqueue):
docker compose --env-file infra/.env -f infra/compose.backend.yml exec postgres psql -U stagelink -d stagelink_dev -c 'SELECT * FROM foundation_receipts;'
# Pending / dead-letter inspection (local operators only):
docker compose --env-file infra/.env -f infra/compose.backend.yml exec postgres psql -U stagelink -d stagelink_dev -c 'SELECT id, topic, processed_at, dead_lettered_at, last_error_code FROM outbox_events;'
# Stop without deleting persistent volumes:
docker compose --env-file infra/.env -f infra/compose.backend.yml down
```

Do not run volume deletion against a database you need. No production deployment configuration is supplied by this foundation.

## Host development

Use Node 24.22.1 and Python 3.12.14. Existing frontend pnpm commands are unchanged; backend uses npm in its own folder.

```sh
cd backend
npm ci
npm run db:generate
cp .env.example .env
# Load these local settings explicitly (the dev scripts do not silently load credentials).
set -a
. ./.env
set +a
npm run db:migrate
npm run dev:api
# In another terminal with the same environment: npm run dev:worker
```

Start just the database services with the Compose command plus `postgres redis` if running Node on the host. Local `.env` is ignored by Git. Example credentials are intentionally local-only and are not provider secrets.

```sh
cd backend
npm run typecheck
npm test
npm run contracts
cd ai
uv sync --frozen
uv run --frozen pytest -q
uv run --frozen uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

## Integration tests

For the provided isolated local setup, run `sh backend/scripts/check-integration.sh` from the repository root. It uses `infra/compose.test.yml`, a separate Compose project, PostgreSQL port 55433, Redis port 56380, and a dedicated `stagelink_test` database. Stop those test services with `docker compose -f infra/compose.test.yml down`.

For a manually managed database, use a dedicated disposable `*_test` database and isolated Redis. CI creates these services; local tests explicitly reject a non-test database. From `backend/`:

```sh
NODE_ENV=test \
DATABASE_URL='postgresql://stagelink:local-development-only@127.0.0.1:55432/stagelink_test?connect_timeout=3' \
REDIS_URL='redis://127.0.0.1:56379/1' npm run db:migrate
# Reuse these exact environment variables for:
npm run test:integration
```

Create `stagelink_test` first using your local PostgreSQL administrator. The example command sets variables for one command only; export them or repeat the prefix before the test command. Tests cover rollback, queue publication failure, Redis job loss, duplicate/concurrent consumption, dead letters and an actual worker process stop/restart. They remove only their own records/jobs. They do not flush Redis or truncate shared tables. Unknown external/provider outcomes are outside this harmless internal diagnostic.

Generated contract: `contracts/openapi.json` → `packages/contracts/src/api.d.ts`. Regenerate after endpoint changes, commit both, and let CI check drift. Update the expected migration constant when a phase adds a new migration. Do not edit already-applied migration SQL.
