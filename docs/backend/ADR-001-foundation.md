# ADR 001: backend foundation

Date: 2026-11-01. Status: accepted implementation decisions for local foundation; commercial provider activation is deferred.

The supplied PDF and editable proposal are the requirement sources. No separately named final report was found. The working UI is React/Vite; retain it. The approved full plan and 55-feature UI coverage inventory are adjacent to this record.

## Deployment and tooling

Start with a modular NestJS business API, a separate BullMQ worker, and an internal FastAPI AI service. PostgreSQL owns durable state; Redis carries jobs and later caches/presence. This is not five independently deployed domain services. Keep business transactions within one database, with service extraction possible later.

The existing frontend stays at the repository root with its pnpm lockfile. `backend/` is an independent npm package with its own exact dependency versions and lockfile. Python uses an exact uv lockfile. Prisma schema/migrations live under `backend/prisma/` so generated clients resolve within the backend package. This avoids a frontend workspace migration during infrastructure work.

Pin Node 24.22.1, NestJS 12.3.2, Prisma/client/pg adapter 7.10.1, Swagger 12.0.5, Zod 4.6.7, BullMQ 5.63.0, ioredis 5.8.2, TypeScript 5.9.3, PostgreSQL 17.11, Redis 7.4.12, Python 3.12.14 and uv 0.11.29. The OpenAPI TypeScript generator is pinned to 7.13.0. Its Redocly/minimatch development dependency currently has a moderate advisory; generation only accepts the committed local contract. The audit-suggested older generator introduced high-severity Undici dependencies, so it was not retained. No unsupported transitive major override is forced. Reassess when upstream ships a compatible fix. These are compatibility pins, not a claim that every tool is the newest release. Reassess ORM and dependency support/security before staging. Prisma 7 uses the generated ESM client and PostgreSQL driver adapter, with explicit connection and query timeouts. Initial NestJS 11 / Prisma 6 pins were replaced before commit after the dependency audit found advisories; no vulnerable override is silently forced. Use native SQL for constraints/locking and retain migration checksums/advisory locking from Prisma migrate deploy.

## Contracts and operability

REST prefix `/api/v1`; generated OpenAPI and TypeScript transport types are version controlled. Only health endpoints are implemented in P01. Documentation UI is disabled in production. Add authenticated Socket.IO room contracts in P10. Server generates request IDs; structured logs permit only operational fields. Never log bodies, raw errors, query strings, cookies, authorization headers, URLs containing credentials or personal data.

Liveness means process alive. API readiness requires PostgreSQL, Redis and the expected applied migration. Worker readiness additionally requires a recent dispatcher scan and an active consumer. AI readiness currently means its health-only shell initialized; it does not claim an available model. No generation endpoints, token metrics or provider calls are fabricated.

Events are inserted in the same DB transaction as future business changes. Dispatcher uses short leases and SKIP LOCKED, and only the consumer marks processed. Pending DB events are republished after leases expire even if Redis loses an acknowledged job. A dedup record, effect and processed marker share one transaction; row locks serialize competing consumers. Internal ping is an explicit CLI diagnostic, never a public unauthenticated mutation. Unsupported events are retained as dead letters; infrastructure failures remain pending and retry. Financial/provider commands will need separate reconciliation semantics.

## Policies for later phases

- Identity: P02 adds short-lived access tokens and rotated, hashed refresh sessions in secure HttpOnly cookies, CSRF/origin controls and server-enforced roles. Do not trust the UI role selector. No public admin signup or default admin password.
- Money: integer minor units with explicit ISO currency; new production LKR. Legacy USD demos stay isolated. No implicit currency conversion or relabeling. Server snapshots agreed quotes; formal booking advance is 50%, platform fee is 5% once on the original amount, subject to validated provider capabilities.
- State: implement explicit authorized transitions, revision checks and idempotency keys per the full plan. The proposal's differing shorthand state sequences do not become an invented database enum now.
- Privacy: default private identity/evidence/chat, least-privilege reads, short-lived object access and retention rules. UTC timestamps plus event IANA timezone. Provider ownership must be per account.
- Media: S3 adapter in P04, private evidence separate from public approved portfolio derivatives. No production local-files fallback.
- Payments: PayHere primary and eligible Stripe adapter. Actual collection/refunds/payouts/holding require verified account capabilities. No real money movement or legal escrow claim from a UI label.
- Agreement/evidence: authenticated acknowledgments and hashes are the initial evidence design. They do not automatically constitute a qualified/legal signature or certify photo damage. Review signer/legal requirements and photo-comparison scope before activation.
- AI: FastAPI boundary, OpenAI/Gemini adapters in P15 with provider keys, versioned prompts, budgets and sourced factual equipment fields. No LLM authorizes payments or inventory.
- Scope: event posts, venues, weekly rental rules, semantic retrieval, two-phase holds, serial records, KYC/BR and audit evidence remain in the full backlog, not silently excluded by the current UI.

## References checked

- [NestJS application setup](https://docs.nestjs.com/first-steps) and [OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [Prisma v7 migration and adapter requirements](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [BullMQ connections](https://docs.bullmq.io/guide/connections)
- [PostgreSQL supported versions](https://www.postgresql.org/support/versioning/)
- [Redis supported versions](https://github.com/redis/redis/security) and [release archive](https://download.redis.io/releases/)
- [FastAPI Docker deployment](https://fastapi.tiangolo.com/deployment/docker/)
