# StageLink backend implementation plan

Prepared 1 November 2026. Scope: all current public, customer, artist, equipment-provider and administrator UI workflows, the 14 completed frontend feature extensions, and remaining backend responsibilities named in the supplied proposal. This request supersedes the earlier frontend-only restriction for future implementation. This deliverable is a plan; no backend application, Git branch or live integration was created during planning.

## 1. Baseline and source of requirements

Repository: `/Users/nezz/Desktop/Git/Antigravity/StageLink_UI`. Current branch: `main`. Baseline commit: `9cbbe0ded3112a347c8ba1ffdf7029bd4fde268e`. The working tree was clean at inspection. The root project is React/TypeScript/Vite, with two shared in-memory state providers and a frontend-only Docker Compose service. It does not contain the proposed API/database services.

Requirements were checked against both `06_Fusion 5_Final proposal.pdf` and `Project Proposal Fusion 5 .docx`, plus current source and the 25 October implementation/evaluation checkpoints. A separately named final project report was not found. The technology baseline below therefore uses the supplied proposal. If a different final report exists, compare it at P00 before locking versions or installing tools; do not silently treat the evaluation guide as a separate approved technology report.

The proposal's frontend references React/Next.js. The existing app uses React/Vite. Backend integration will retain that working frontend. A Next.js/SSR migration is a separate decision, not a prerequisite or an unannounced rewrite.

The proposal and editable document differ in the shorthand booking-state sequence. Neither becomes the database enum without an approved transition table. They also repeat F4.6 for two features. Track requirements by module and feature name as well as proposal number.

### Completion target

Every business-data screen reads authorized persisted records, every mutation is validated by the server, independent users see the same resulting state, and a reload/restart does not reset committed data. Empty databases show honest empty states. Failures show unavailable/retry states. Demo content is permitted only in explicit isolated development/test fixtures.

“All UI parts” includes the interfaces' actions and failure states, not merely creating tables with matching names. See `UI-Backend-Coverage.csv` and `backend-backlog.json` for traceability and implementation order.

## 2. Technology decisions

### Stack from the proposal

| Area | Planned choice | Purpose |
|---|---|---|
| Main API | Node.js + NestJS + TypeScript | Versioned REST endpoints, input validation, authorization and five domain modules; choose NestJS from the proposal's Express/NestJS alternatives |
| Main database | PostgreSQL | Durable relational records, constraints, transactions, reservation consistency and payment records |
| Cache/session/coordination | Redis | Search cache, transient presence, rate limiting/revocation coordination and worker transport; not the authority for inventory or money |
| Real-time | Socket.IO | Authorized inquiry/booking/support conversations, message acknowledgements, typing/read state and UI invalidations |
| Worker | Node.js + BullMQ | Reminders, notifications, document/media processing and integration reconciliation; cron is a scanner/reconciliation trigger, not a second independent sender |
| AI service | Python + FastAPI | Central matchmaking and content-generation boundary, independent deployment and health reporting |
| AI providers | OpenAI and Gemini adapters | Structured bio/gig/spec suggestions; explicit configured default and controlled failover, both traced separately |
| File storage | AWS S3 | Private evidence/attachments/documents and public approved portfolio derivatives; chosen from S3/Cloudinary alternatives; Cloudinary is not also required for v1 |
| Payment | PayHere primary sandbox adapter; Stripe adapter | Verified collection/refund and eligible provider settlement flows; live capabilities depend on merchant/account support |
| Email | Nodemailer + SMTP provider | Verification, password recovery, transactional emails and later consented campaigns |
| SMS | text.lk API | Transactional pre-event messages with delivery/reconciliation tracking |
| Delivery | Docker, GitHub Actions, AWS EC2 | Reproducible local environment, tested images, staged deployment and rollback |

Use supported compatible runtime/database versions and pin them at P00 after checking official release/support information. Do not use floating `latest` image tags for the new backend services. Keep model identifiers and pricing configuration outside source defaults; resolve them at provider setup rather than inventing a model.

### Additional implementation tooling, explicitly proposed

The report does not prescribe an ORM, contract generator or test harness. Recommended additions: Prisma for schema/client/migrations, version-controlled native SQL where PostgreSQL constraints/locking are needed, OpenAPI for API contracts, PostgreSQL PostGIS for indexed radius queries, pgvector for the proposal's semantic matching, pytest for the AI service, and browser API/end-to-end tests with the project's chosen runner. Password hashing, JSON/schema validation, structured logging and monitoring libraries are implementation details to record in an architecture decision. They must not become a reason to replace the proposal stack.

Prisma/ORM convenience does not replace database constraints. Use SQL migrations for exclusion constraints or features the selected ORM cannot express. Confirm current Prisma transaction/migration APIs before implementation; do not copy code against an assumed major version.

## 3. Deployment and module boundaries

Recommended first release: one modular NestJS business API, a separately runnable worker and a separate FastAPI AI service. PostgreSQL and Redis are shared infrastructure with explicit ownership. NestJS modules follow the five proposal responsibilities, but the booking/reservation/ledger transaction can remain within one database transaction.

The proposal uses “microservices.” This topology deliberately starts the Node business modules in one deployable service while keeping API/worker/AI process boundaries. Record this as ADR-001 at P00. If evaluation requires five independently deployed Node services, agree that before scaffolding; that alternative also requires explicit distributed consistency, outbox and service-auth contracts. Do not claim five production microservices when shipping a modular API.

```text
Existing React/Vite UI
  ├─ HTTPS REST /api/v1 ──> NestJS API
  │                          ├─ identity / customer
  │                          ├─ artist / catalog / media
  │                          ├─ rental / inventory / inspection
  │                          ├─ booking / chat / quotations / money / documents
  │                          └─ admin / support / AI control / notifications
  └─ authenticated Socket.IO -> same authorized domain services

NestJS API -> PostgreSQL transactions + durable outbox
           -> private S3 assets
           -> Redis caches / rate limits
           -> FastAPI internal service -> configured OpenAI/Gemini
           -> payment-provider adapters

Outbox dispatcher -> BullMQ -> Node worker
                               ├─ SMTP / text.lk
                               ├─ document and media work
                               └─ payment / delivery reconciliation
```

The browser must never contact PostgreSQL, Redis or the internal AI/provider APIs using privileged credentials. Socket.IO handlers invoke the same authorization/domain commands as REST. They are not a second path that bypasses rules.

### Proposed repository layout

Keep root frontend paths stable initially:

```text
src/                         existing frontend
  api/                       HTTP/socket clients and typed feature repositories
backend/
  api/                       NestJS API
  worker/                    BullMQ worker entry points
  ai/                        FastAPI, Python dependencies and tests
packages/
  contracts/                 generated/shared transport schemas
  domain/                    portable TypeScript calculations/rules, extracted gradually
infra/                       Compose extensions and deployment templates
prisma/                      schema and reviewed SQL migrations
contracts/                   OpenAPI and socket event contracts
scripts/                     development fixtures and administrative commands
backend-tests/               integration, concurrency and provider contract tests
 docs/backend/               plan, decisions and feature migration checkpoints
```

No whole-app move into `apps/web` during the foundation ticket. Use workspaces only as needed for the added packages. Preserve current frontend build behavior until a reviewed change updates CI and Docker contexts.

## 4. Git branch and delivery workflow

Integration branch name: **`backend`**, created from the latest verified frontend baseline when implementation begins. If it already exists, inspect and reuse it rather than overwriting it. Recheck `git status`, current HEAD and branch names before switching; preserve any intervening user changes. `main` remains the working frontend reference. No force-push, reset, automatic merge or deployment is implied by this plan.

Use small feature commits on `backend`, optionally short feature branches from it when team workflow needs reviews. Suggested sequence: `chore(backend): foundation`, `feat(auth): persisted sessions`, `feat(catalog): persisted listings`, etc. Every feature checkpoint records API/database/UI/test status separately. Do not merge unfinished backend work into `main` just to preserve progress.

For isolated concurrent frontend work, use a separate managed checkout/worktree for the backend branch; do not let switching branches silently replace the source serving the user's current UI preview. This is a workflow recommendation, not a worktree already created.

### One ticket's completion gate

1. Specify API/events, ownership and migration.
2. Implement database and domain service with transaction/permission tests.
3. Implement API/worker/provider boundary as required.
4. Connect the affected frontend using asynchronous commands and persisted queries.
5. Replace that feature's business fixtures and demo-only controls.
6. Verify reload, two independent users, unauthorized access, errors and relevant concurrency.
7. Update OpenAPI, coverage/backlog, required design states and checkpoint.
8. Commit only the completed slice. Record a blocked external integration honestly without labeling it complete.

The synchronous `dispatch(): boolean` pattern in current contexts cannot pretend a network request is synchronous. Refactor each connected caller to await an explicit result and display pending/error/conflict states. The API returns the authoritative result; optimistic UI is limited to safe reversible actions with rollback.

## 5. Step-by-step replacement of hardcoded business data

### Feature migration modes

Use an explicit development demo entry point/build or an intentionally selected data-source adapter per not-yet-migrated feature during the transition. Once a feature is set to API mode, a failed request must never trigger local fixture mutations or return fake success. Do not silently mix live and fake records in one booking/payment chain.

Integration environments run full user journeys only through already connected dependencies. A not-yet-connected capability is disabled with a truthful explanation. The separate demo build can remain usable for presentations while migration proceeds; production cannot enable demo mutations through a query parameter, role selector or hidden toggle.

| Current source | Replacement | What must disappear from production |
|---|---|---|
| `initialDashboard()` and role-indexed profiles | `/me`, user-scoped profiles and listing APIs | Jordan/Aria/AudioVault as mandatory business records; one account per role assumption |
| `initialCommunity()` | Membership, verification, availability, evidence and bank-account services | Automatically verified seed bank accounts, local inquiry state and fixed email code |
| `initialPipeline()` / `services` constants | Booking/catalog APIs and persisted event/read projections | Seed BK IDs, dates relative to page load, one customer identity and reset-on-refresh records |
| Context reducers | Server commands and query cache; portable calculation code may remain shared | Browser authority over payment, inventory, admin decisions or role ownership |
| `246810` recovery/verification | Expiring one-use hashed tokens/codes and configured delivery | Any production universal code or local-only password-reset success |
| `demoPackages`, package JSON strings | Versioned relational package/add-on data and snapshots | Automatic sample tiers masquerading as a provider's authored catalog |
| `chatAttachments` File map / evidence blob URLs | Persisted assets and authorized signed download access | Refresh-lifetime attachments as the only record |
| `demoCheckout`, demo wallet/card response controls | Gateway session, verified callback and status API | UI buttons that declare paid, failed or transferred without a provider event |
| `sampleMetrics`, deterministic AI text/spec catalog | Versioned generation jobs and measured service metrics | Fake latency/token/cost counters or model-name-only factual spec claims |
| Stock sample scenarios / generated serials | Transactional reservations and provider-maintained inventory units | Pretend lock controls and illustrative serials in real handovers |
| Inspection sample images / simulated sign-off | Authenticated acknowledgment, real evidence and immutable report revisions | Sample image as evidence and simulated names as legal signatures |
| Reminder fixtures, frozen demo clock, sample recipients | Durable scheduled jobs, real booking versions and verified contacts | Manually incremented counts and “run success” controls |
| Hardcoded analytics, browse cards, ratings, location/hero figures | Aggregated public queries, verified reviews and configured content | Fabricated users, ratings, growth/revenue or recommendations |
| Client-only booking PDFs | Server-authoritative document records/snapshots and authenticated downloads | A client-generated success assertion as invoice/receipt authority |

Static UI labels, icons, design tokens, animations, empty-state artwork and a genuine image-loading fallback can remain in code. “Remove hardcoded data” means replace business records and simulated outcomes, not move every color and string into the database. Honest zero/empty results are valid.

Development seed data belongs in explicit repeatable database seed scripts. Never auto-seed production and never import current fictional bank details, media claims or payment history as real accounts/transactions. No production behavior depends on a seed booking existing.

## 6. Shared API and data conventions

- Base path `/api/v1`; authenticated current-user resource `/me`. Public endpoints return only public approved fields. API and socket payloads use stable server-generated IDs; human booking numbers are display identifiers.
- Actor identity is derived from the validated session, never from a posted `role`, user ID or client price. A user may hold approved customer/artist/renter memberships; active-role switching is restricted to those memberships. Admin membership is provisioned separately and cannot be selected at signup.
- Proposed authentication: short-lived JWT access credential and rotating, hashed server-tracked refresh session in a Secure HttpOnly cookie. Define cookie origin, SameSite, CSRF and CORS together. No long-lived browser-localStorage tokens. Passwords use an appropriate password-hashing library; reset/verification tokens are expiring, one-use and rate-limited.
- Money DTO: `{ amountMinor: integer, currency: ISO4217 }`; database storage uses integer minor units with safe serialization (decimal string if exceeding JavaScript safe integer). Frontend formats the currency supplied by the server. Never sum currencies or add gateway fees to a quote silently.
- Proposed new production default currency: LKR, consistent with the local PayHere scope. Existing USD examples stay isolated dev fixtures. Confirm supported currencies with the merchant account; do not relabel `$600` as `LKR 600` or implement implicit FX. Currency, fee policy, advance rule and deposit policy are immutable booking/quote snapshots.
- API timestamps use UTC and include the event's IANA timezone. Booking/rental dates and daily/weekly rates use event-local time, not the API host timezone. Preserve the current UI's same-day restriction until an explicit overnight/multi-day contract and UI validation are added.
- Pagination/filter/sort contracts for lists; bounded search inputs, upload limits and command rate limits. Stable error codes plus field errors, request ID and retry guidance. Expected conflicts are 409/revision failures; unauthenticated/forbidden requests cannot reveal other users' records.
- Every mutable aggregate has a revision. Critical commands use an expected revision/If-Match and an idempotency key. Reject stale confirmations; do not use a generic patch endpoint to set financial or lifecycle status arbitrarily.
- OpenAPI-generated contracts and socket envelopes are versioned. Sensitive data is excluded from logs; errors must not expose bank numbers, credentials, session tokens, private prompts or documents.
- Write events/outbox entries in the same transaction as state changes. Dispatch after commit. Workers record attempts and deduplicate outcomes in PostgreSQL. Redis/BullMQ is not the only surviving evidence of a payment, message or scheduled reminder.

## 7. Database domains and principal constraints

Schema names below are planned logical entities. P01 creates shared foundations; later phases create domain migrations just before use, rather than committing an untested universal schema at once.

| Domain | Principal tables | Required constraints / behavior |
|---|---|---|
| Identity | users, user_roles, customer_profiles, artist_profiles, renter_profiles, admin_memberships, sessions, auth_tokens | Unique normalized email, role approval, hashed credentials/tokens, revocation and ownership |
| Profiles/verification | profile_locations, provider_documents, verification_cases, payout_destinations, payout_destination_reviews | User/provider foreign keys, private documents, revisioned destination; account change pauses payout |
| Assets | assets, asset_links, asset_processing_jobs | Owner/purpose/object key, checksum/size/MIME/quarantine/visibility; private evidence; no orphan overwrite |
| Catalog | categories, genres, listings, artist_gigs, gig_package_versions, package_tiers, package_addons, equipment_specs, listing_media, rental_policies | Provider ownership, published/draft revision, normalized pricing, referential history and soft deletion |
| Venue/rental extension | venue_details, rental_rate_plans, package_contents | Venue occupancy vs equipment quantity; hourly/daily/weekly terms and explicit minimums |
| Discovery | event_posts, event_post_requirements, saved_items, listing_embeddings, recommendation_runs | Customer ownership, unique saved reference, tagged embedding model/version, consented approximate locations |
| Availability | availability_rules, availability_exceptions, provider_reservations | Provider-wide calendar, timezone and revisions; no overlap for occupied confirmed provider intervals |
| Inventory | inventory_units, inventory_capacity, inventory_reservations, reservation_lines, inventory_movements | Real unique serials per owner, quantity checks under common locks, expiry, custody/maintenance/quarantine |
| Bookings | bookings, booking_lines, booking_package_snapshots, booking_policy_snapshots, booking_events, completion_records, check_ins | Customer/provider IDs, immutable agreement basis, transition revisions and explicit real-time conditions |
| Communication | conversations, conversation_members, messages, message_attachments, conversation_reads | Inquiry/booking/support kind, authorized members, unique client request ID, ordered durable cursor |
| Agreements | quotations, quotation_lines, quotation_decisions, agreement_artifacts | Version unique within booking, explicit current pending offer, self-acceptance prevention, immutable accepted hash |
| Money | payment_orders, payment_attempts, provider_events, financial_accounts, journal_transactions, journal_entries, fund_allocations, refunds, transfer_orders, transfer_attempts, reconciliation_runs | Unique provider event/transaction and idempotency key, balanced journals, separate currencies, immutable entries, allocation <= eligible held funds |
| Deposits/inspection | deposit_obligations, inspection_reports, inspection_unit_observations, inspection_accessories, inspection_acknowledgments, inspection_photo_pairs, damage_claims, clearance_reports | Deposit separate from service advance, evidence owner/version, immutable submitted report, custody retained until clearance |
| Documents | documents, document_versions, document_transactions | Stable server-issued number, immutable payment/quote snapshot, private object reference and render status |
| Reviews | reviews, review_media, review_moderation | Verified participant + eligible completed booking; one review per allowed booking role; aggregates exclude hidden content |
| Cases/support | cases, case_members, case_notes, case_evidence, arbitration_decisions, arbitration_executions | Member-visible vs internal notes, evidence access, reasoned decisions, staged settlement state |
| AI | ai_configs, prompt_templates, prompt_versions, generation_jobs, model_calls, ai_usage, ai_cache_metadata, matching_versions | Actual selected/published version, request limits, provenance, redacted retention and per-provider metrics |
| Operations | notifications, notification_preferences, scheduled_reminders, delivery_attempts, announcements, campaigns, campaign_recipients, system_settings, audit_logs, outbox_events | Unique schedule/recipient/version key, reschedule invalidation, immutable actor audit, idempotent consumers |

Use dedicated indexes based on real queries: public listing type/status/location, provider availability range, customer/provider booking start, conversation cursor, unique quote version, gateway event key, scheduled job due/status, case status/assignee and audit timestamp. PostgreSQL range/exclusion constraints can enforce exclusive provider/venue reservations; pooled stock still needs quantity-aware transactions.

### Audit and agreement evidence

The proposal mentions SHA-256 SLA stamps and tamper-evident logging. Canonicalize accepted terms, participants, version and timestamps; store its SHA-256 digest and immutable artifact. A hash is not a cryptographic signature or proof of legal consent by itself. Capture authenticated acceptance events. If signed artifacts are required by the final report, add a managed signing-key design and public verification contract at P00. Hash-chain/HMAC audit records need an independently protected key/anchor; a mutable hash alongside mutable data is not meaningful tamper protection.

## 8. Core transaction and failure designs

### Availability and reservation

Artist bookings lock the provider's occupied interval across all of their gigs. Empty dates and personal blocks are protected by the same shared availability service; blocking personal time does not silently cancel existing bookings. Venue bookings use exclusive/capacity rules appropriate to the selected product, not equipment unit arithmetic.

For equipment, lock a common owner/listing inventory-capacity row (or materialized date-allocation rows using one consistent strategy), then recompute eligible capacity/reservations within the transaction before creating/renewing a hold. Lock dates/resources in deterministic order for multi-line/multi-day reservations. Add uniqueness/check/exclusion constraints where appropriate, bounded retries for deadlock/serialization conflicts, and tests against real PostgreSQL connections.

Do not rely on a Redis lock or a client “2 available” label as final authority. Hold expiry uses server time and persisted expiry; it must be checked on commands even if the cleanup worker is late. Explicit server-issued checkout reservation leases define the protection window while gateway payment is in progress. A late successful payment after lease expiry is recorded and reconciled; it cannot create overcapacity.

Out-on-rental, overdue, damaged, maintenance and return-awaiting-inspection units remain unavailable according to actual custody. Refunding a rental does not physically return its equipment. Capacity edits and serial assignment use the same locking path and cannot reduce below committed allocations without an explicit managed exception.

### Booking and quotation state

Define booking, quotation, payment, fulfillment and dispute states separately. The visible five milestones are a projection, not a writable status endpoint. Enforce provider ownership, current revision, availability, package/deposit snapshots and 50% policy for all new accepted bookings on the server. Do not permit a caller to select the old 10% rule to bypass it; any legacy migration is controlled and isolated.

Keep quotation decisions and history immutable. Accept the latest eligible pending offer only, by the recipient. The server computes totals and terms. Availability/stock and acceptance are coordinated in a transaction. Later listing edits never rewrite an accepted agreement. Overtime is a separate proposal accepted by the other party and changes only eligible future balance; unresolved overtime blocks final collection where required.

Real check-in/completion use server time, participant permissions and explicit record evidence. Remove `demo_start`, `demo_finish` and unrestricted clock travel from production. Manual check-in is an authenticated assertion, not location proof; do not imply GPS/QR integration without implementing it.

### Payments, deposits and payouts

Build the immutable financial journal before enabling money movement. The original service price, platform fee, gateway fee, advance, refundable deposit, balance, refund and provider payout are distinct amounts/purposes. New agreements use the requested 50% service advance and the current 5% original-price platform fee unless an explicit policy decision changes it. Snapshot those rules; calculate the fee once, exclude approved overtime from this fee basis, and never sum different currencies.

Create a payment order and gateway session from server-derived amounts. The browser receives only public checkout/session data. Verify PayHere callback checksum or Stripe signature using the provider's required format/raw body and validate merchant/order/currency/amount. Persist provider events before reconciliation; deduplicate repeat/out-of-order notifications. Gateway return/close events affect UI only, not the financial truth.

If the browser closes, the customer cancels, stock expires, or the quote becomes ineligible while a charge later succeeds, record the received funds and put the booking/payment into explicit reconciliation/refund-needed review. Do not ignore a real provider success because the UI is closed, and do not mark a now-impossible reservation confirmed. Provider timeouts are unknown/pending until queried or reconciled, not automatically failed and retried into a duplicate transfer.

A payout order reserves eligible funds atomically, snapshots the verified destination revision, then submits via an idempotent worker/provider operation. Only a verified provider result marks transferred. Recheck account/destination changes and holds at the execution boundary. Do not keep a database transaction open while waiting for an external API.

Implement PayHere and Stripe behind one capability-aware interface. PayHere Checkout's collection support does not by itself prove split payouts, long-term holding or separate security-deposit custody. Validate merchant country/currency/account and actual payout/refund capabilities before committing the UI to them. Stripe Connect eligibility is also account/country-dependent. Unsupported capabilities remain visibly unavailable. Never label internal ledger allocation as a completed bank transfer or legally established escrow.

The separate equipment deposit is a genuine obligation with payment/refund/claim state; displaying a policy is not collection. Decide collection vs authorization-hold strategy from provider capabilities, rental duration and explicit terms. Treat deposit changes after booking as a new agreed obligation, not a silent charge.

### Real-time and notifications

Persist messages before acknowledgement and broadcast after commit. Use client message IDs, server sequence/cursors, pagination and reconnect catch-up. Socket.IO's ordered events are not an exactly-once durable message database. Authenticated room membership is checked server-side; guessed booking IDs cannot join another conversation. Scoped typing/presence is ephemeral and expires. Read state is an authorized per-user cursor. Admin access to private chats requires case/support permissions and an audit record.

Use a durable outbox for booking/payment/notification events. BullMQ jobs can retry; consumers must be idempotent. A deterministic reminder key includes booking, schedule revision, offset, channel, recipient and template version. The 24-hour and 2-hour jobs are rescheduled/cancelled when booking date, recipient or eligibility changes. At delivery, recheck current eligibility and dedup state. A provider timeout may have sent a message: store provider IDs/status and reconcile before blindly retrying. Exactly-once external SMS/email cannot be promised without provider support; surface uncertain delivery distinctly.

### AI and recommendations

FastAPI receives authorized internal requests with budgets/deadlines and versioned config, not browser-held model keys. Support artist bio, gig title/description, equipment spec/inclusion/policy suggestions and top-three event recommendations. Structured output is validated again by the service. User input and uploaded descriptions are untrusted data, not system instructions.

Start matchmaking with transparent server-side normalized genre/budget/location/rating weights, then add the proposal's semantic retrieval using real embeddings stored with model/version metadata. Eligibility, verification, availability and currency compatibility filter candidates before ranking. Exclude missing facts rather than manufacturing reviews, distances or price matches. Publishing weights must change subsequent recommendation runs and the saved run must record the config version. Use a fixed evaluation set and report the baseline vs semantic behavior.

Generation is a suggestion requiring user review, never automatic publication or a factual certification. Equipment wattage/SPL/weight must cite an approved source/catalog where factual auto-fill is offered. Unknown/ambiguous models return partial/unknown fields rather than invented numbers. Recommended deposit is a suggestion subject to provider policy. No LLM can authorize refunds, mark paid or override inventory. Actual latency, tokens, cache hits and failure counts come from calls and service instrumentation, not `sampleMetrics()`.

## 9. Implementation phases and acceptance gates

Phase order is dependency-driven. Each phase consists of small tickets in `backend-backlog.json`; no phase is marked complete from API scaffolding alone.

### P00 — Branch, requirements and baseline

- Recheck latest source, branch and dirty state; create/reuse `backend` from the verified baseline in an isolated checkout when appropriate.
- Bring this plan into `docs/backend/`; capture current frontend screenshots, existing 158-test baseline, typecheck/build and routing inventory.
- Resolve proposal/report source and ADRs: modular API topology, NestJS, database/tool versions, auth/session, currency/advance/fee policy, privacy visibility, media provider, payment capability and signing requirements.
- Inventory all UI actions and unimplemented report items; agree event/venue/weekly rental/semantic scope explicitly.
- Gate: branch is isolated, UI still works, contracts/decisions and test baseline are recorded. No secrets, provider account signup or live transactions are required to finish planning/foundation.

### P01 — API, database, cache and worker foundation

- Scaffold NestJS API and worker, FastAPI health shell, OpenAPI, request IDs, structured errors/logging and validated configuration.
- Extend Compose with PostgreSQL/Redis and separate API/worker/AI services; retain the current frontend container. Add empty DB migrations, migration locking, local setup and environment examples. Current `.gitignore` excludes `.env*`; explicitly permit sanitized `.env.example` files.
- Configure CI for TS/Python checks, disposable PostgreSQL/Redis integration tests and image builds. Add liveness/readiness and migration/version checks.
- Establish an outbox table/dispatcher and worker retry/dead-letter pattern with a harmless internal test event.
- Gate: a clean checkout boots reproducibly, migrations work on an empty DB, health failures are accurate, and no production business feature falls back to fixtures.

### P02 — Authentication and account recovery

- Persist signup/login/logout/current session, role memberships, password hash, rotating refresh sessions and revocation.
- Connect onboarding identity fields, email verification, password reset request/verify/complete and resend limits to actual token state and a development mail catcher or configured SMTP. SMTP delivery is a separate acceptance test.
- Remove universal code and role-selector authentication. Administrative account bootstrap is a controlled command, not public registration.
- Gate: two independent customer/provider sessions persist through reload, unauthorized account access fails, tokens expire/revoke correctly, no demo account is auto-signed-in, and password reset changes the real credential once.

### P03 — Profiles, provider onboarding and destinations

- Replace role-indexed sample profiles with account/provider records, contact details, categories, experience, location/service radius, operational hours and rental terms.
- Persist editable profile forms and verified-email changes. Preserve provider approval status. Validate and store exact locations privately with public approximate service location.
- Store payout destination through provider tokenization or encrypted restricted fields; admin review, reasons and revisions pause queued payouts after edits.
- Gate: one artist's profile/destination never overwrites another's, private data is masked, and unverified destination changes cannot authorize a payout.

### P04 — Durable media and verification evidence

- Build upload initiation/finalization, private object ownership, short-lived signed access, quarantine/validation and orphan cleanup. Use unique keys; a presigned URL is not single-use or proof that an object is safe.
- Connect avatar/gallery, equipment images, audio/video, booking attachments, review photos and verification/support/inspection evidence as their features become live.
- Extract/transcode bounded media metadata and waveform/30-second audition derivatives in worker jobs; preserve caption/transcript/feature/remove behavior. Allowlist YouTube/Vimeo embeds without arbitrary server fetches.
- Gate: files remain after reload, unauthorized access fails, MIME/size mismatches and unsafe uploads fail, deletion respects active evidence retention, and empty portfolios do not play fake artist performances.

### P05 — Catalog, packages, specs and rental policies

- Persist listing create/edit/publish/pause/maintenance/archive with ownership and current version. Separate drafts and published revisions.
- Normalize artist package tiers, custom quote packages, duration, lineup, included/excluded services and add-ons; preserve immutable booking snapshots later.
- Persist equipment technical fields/provenance, rate plans, quantity and real serial-unit registry. Persist fixed/percentage/none deposit terms and currency.
- Add report-scoped venue and hourly/daily/weekly rental contracts with the minimal matching UI fields where absent; choose explicit capacity/exclusivity rules.
- Gate: public pages show only eligible published data; old bookings survive listing edits/deletion; package/deposit versions reject stale saves; no sample listing appears on an empty DB.

### P06 — Public feed, discovery, event briefs and reviews foundation

- Replace landing/browse/rental/detail cards, filters, ratings and price bands with paginated DB queries and honest aggregates.
- Implement genre/type/location-radius/budget/rating search and normalized public listing data. Cache only safe public projections and invalidate after changes.
- Implement the proposal's customer event requirement posts CRUD and connect a minimal existing-style wizard/feed; this is distinct from requesting one specific provider.
- Add recommendation consumer contract now; actual ranked service arrives at P15. Until then show unavailable/eligible browse results without labeling them AI recommendations.
- Gate: public data excludes private fields, radius/currency filters are correct, search cache invalidates, event briefs persist, and counts are never fabricated.

### P07 — Saved items, drafts and pre-booking inquiries

- Persist per-user categorized saved references and safe resumable form/message drafts; unify old numeric artist favorites with catalog IDs.
- Persist listing inquiries and members; use the conversation model that P10 will stream. Allow inquiry-to-booking linking without losing history.
- Sensitive payout credentials are not stored in generic plaintext drafts. Draft ownership/versioning and discard/submit consumption are server-enforced.
- Gate: saved references and drafts survive reload, another user cannot see them, removed listings remain removable, and saving does not reserve stock or lock a price.

### P08 — Availability, inventory holds and booking requests

- Implement recurring schedules, provider-wide blackout CRUD, private reasons, expected revisions and timezone-aware public availability.
- Create request/review/list/detail/calendar/history APIs and server calculations using actual customer/provider/listing IDs.
- Implement transactional provider/venue reservation and quantity stock holds/expiry/renewal. Create real event notifications/outbox entries.
- Gate: simultaneous independent requests cannot exceed stock or overlap exclusive confirmed slots; stale requests fail safely; holds recover after worker downtime; blocked reasons remain private; cancellation/rejection releases eligible reservations only.

### P09 — Booking decisions, quotations and agreements

- Port provider accept/reject, structured quote/counteroffer/decline/accept, accepted snapshots and explicit FSM transitions.
- Enforce 50% new-booking policy, once-only original-price fee terms and separate security-deposit obligation. Preserve nonfinancial payment-unavailable states until provider integration exists.
- Generate canonical accepted-terms artifact/hash and authenticated consent evidence; apply actual signature design if required by the resolved report.
- Gate: own/stale/superseded/duplicate offers cannot be accepted; quote and stock updates commit consistently; revised catalogs cannot alter agreements; no browser can set `paid` or bypass required advance.

### P10 — Real-time chat and notifications transport

- Stream authorized inquiry/booking conversations, attachments and quotation updates using Socket.IO with persisted messages, ack IDs, cursors/read receipts and ephemeral typing.
- Implement reconnect catch-up and participant-specific unread counts. Shared business commands must not bypass REST permissions.
- Stream scoped booking/stock/payment invalidations so UI refetches server projections. Add multi-node Redis adapter only when deployed with multiple instances; do not assume it supplies durable recovery.
- Gate: two separate users/devices exchange messages, duplicate emits produce one message, reconnect catches up without leakage, expired sessions cannot remain subscribed, and fake typing/reply controls are removed in API mode.

### P11 — Financial journal, payment orders and gateway collection

- Implement append-only balanced journal, payment purposes/orders/attempts, idempotency/provider-event intake and reconciliation. Derive balances from posted records.
- Connect PayHere sandbox first and Stripe sandbox adapter next, each with verified notifications and supported account/currency config. Hosted/provider-controlled card collection replaces raw demo-card handling; do not send PAN/CVV through StageLink servers.
- Connect real pending/success/failure/cancel/expired and late-success UI flows. Model advance/balance/deposit separately, including authorized/expired holds where the provider supports them.
- Gate: repeated/out-of-order/forged callbacks, wrong amount/currency/order, close-and-late-success, expired-stock success and concurrent collects preserve funds and consistency. Both adapters are either verified or explicitly separately pending; collection is not called “real escrow” from a database balance alone.

### P12 — Completion, refunds, payouts and reconciliation

- Connect provider check-in/completion, approved overtime, admin verification, destination verification, payout holds and balances.
- Build refund and payout orders with atomic fund reservation, provider idempotency, outcome reconciliation, partial outcomes and audit. Provider transfer failure/unknown never becomes success via UI action.
- Enforce held-until-required-conditions on new 50% bookings; deduct the original-price fee once; account edits invalidate/review stale payout orders.
- Gate: no early/duplicate release, refund and payout cannot spend the same funds, unknown provider outcomes reconcile, and physical rental stock is not released by a financial refund.

### P13 — Documents, milestone projections and verified reviews

- Move invoice/receipt/settlement authority to stable server document records and versioned quote/payment snapshots. Generate PDF using a shared renderer/worker; retain current layout where possible.
- Serve authenticated previews/downloads with pending/render-error/retry states. Approved issuer/tax/company fields are configuration; do not invent a tax identity or label a document tax-compliant without the required setup.
- Derive five-stage journey, sub-statuses, activity and booking/provider financial views from persisted records.
- Connect verified completed-booking ratings/reviews, permitted photo attachments and moderation/aggregation.
- Gate: documents and balances agree, a payment receipt represents the specific transaction, document versions survive later changes, users cannot review another booking, and customer views do not leak provider/private financial fields.

### P14 — Equipment dispatch, return, damage and deposit settlement

- Allocate actual serials atomically; persist accessory manifest and dispatch/return/clearance drafts, submit/correction history and authenticated counterparty acknowledgment.
- Link real private photos, pair dispatch/return evidence and generate comparison reports. Provide reviewed side-by-side/difference assistance; if automated image-diff is required by the report, implement and validate a bounded Python image-processing job as an explicit additional tool. It must not automatically declare liability from lighting/perspective differences.
- Connect damage proposal, accepted/disputed response, admin review and separate deposit refund/deduction through money services. Deduction cannot exceed the eligible collected deposit or fabricate a charge on a $0 policy.
- Gate: concurrent handovers cannot reuse a serial, discrepancies retain custody/quarantine, report corrections preserve previous evidence, returned stock is cleared explicitly, and deposit movements reconcile with actual provider outcomes.

### P15 — Central AI, semantic recommendations and Model Ops

- Implement FastAPI internal authentication, request contracts, provider adapters, structured outputs, quotas/budgets, timeouts and cancellation.
- Connect artist bio/gig title-description generation, equipment specs/inclusions/policy suggestions and event requirement recommendations. Expand current prompt-key UI beyond bio/equipment if the gig template is distinct.
- Persist prompt drafts/publish/rollback versions; implement weights that affect actual recommendations. Store embeddings and evaluate eligibility-filtered semantic retrieval/ranking.
- Replace sample metrics with measured request latency, tokens, provider/model/status and cache counters; admin filters query real observations. Redact prompts/user data by policy.
- Gate: generation suggestions do not overwrite drafts without confirmation, unknown specs remain unknown, published versions affect subsequent calls, quotas/costs are enforced, outage does not generate fake results, and recommendations use real current eligible listings.

### P16 — Support, verification and dispute administration

- Connect provider verification submissions/document review/reject/resubmit, support case/member replies, private staff notes/assignments/reopen and authorized support chat.
- Connect dispute evidence and full-refund/provider/custom-split arbitration, revisioned decision review and execution through the financial service.
- Keep decision approved, execution pending/failed/reconciling and settled/resolved distinct; preserve actor/reason/evidence versions.
- Gate: participants cannot read internal notes or other cases, evidence access is checked at download, stale arbitration cannot spend changed funds, and case closure reflects actual settled/reconciled disposition.

### P17 — Delivery, reminder queue and admin system controls

- Persist in-app notifications/preferences/read state and transactional templates. Connect SMTP/text.lk with environment-specific recipients, sender setup and delivery IDs.
- Schedule **24-hour and 2-hour** reminders, retry/backoff/dead-letter, cancellation/reschedule logic and queue details/history. Admin counters derive from jobs in the selected timezone/window, including unknown/accepted/delivered distinctions where providers support them.
- Connect maintenance/read-only mode, scoped session revocation, cache invalidation, persisted announcements and consent-aware promotional campaigns. Operational controls perform their named bounded operation and leave audit records.
- Gate: queue survives restart, retries deduplicate, cancelled/rescheduled events suppress obsolete sends, no API timeout is falsely counted delivered, refresh queries real worker/provider status, and general cache purge cannot erase money/reservations.

### P18 — Analytics, complete hardcode removal and release

- Replace all KPI, revenue/GMV, user growth, booking charts and provider earnings with currency-aware documented queries/materialized projections; distinguish test/live and captured/refunded/released values.
- Remove production fixture imports, demo wallet/cards, response/clock controls, universal OTPs, generated serials, fake reviews/media and context reset-to-seeds. Keep explicit developer/test fixtures isolated.
- Complete security/object-authorization tests, real PostgreSQL concurrency tests, two-browser journeys, desktop/mobile/accessibility/theme checks, actual PDF/media/file tests and provider sandbox contract suites.
- Deploy staging through GitHub Actions/Docker to AWS, run migrations/backups/restore and worker recovery checks, verify observability and reconcile a full sandbox booking/rental/refund case.
- Gate: all coverage rows pass or are documented as real remaining blockers. Live provider activation and production rollout require separately reviewed accounts/configuration and an explicit release step; a successful build is not a deployment or financial-integration sign-off.

## 10. UI behavior to preserve or change deliberately

Preserve the StageLink visual language, themes, navigation and existing component structure. Keep design-only changes out of backend tickets unless needed for honest state handling. For each connected flow add loading, unavailable, permission denied, expired session, validation, stale revision, upload progress and retry/empty states where missing.

Specific necessary changes: real multi-user login/logout; removal of unrestricted role switching; currency-aware formatting; provider-hosted payment fields; explicit long-running document/media/AI jobs; persisted drafts; server-issued serials; removal of demo start/finish/reply buttons; real notification delivery states; 2-hour reminder filter; actual measured AI counters; prompt types and event-post/venue/weekly rental fields when report scope requires them.

Update Figma, neutral wireframes and connected prototype snapshots only when the UI behavior/layout/states change. Record that work in the same feature ticket. Figma remains a design artifact, not an assertion that live services are connected. A backend-only schema/index change does not require creating duplicate Figma screens.

## 11. Quality gates and definition of done

### Test layers

- Retain and port the current 158 frontend/domain tests as regression specifications; do not treat their seed-centric expectations as production policy. Keep historical demos separate.
- Unit tests: money, package/deposit snapshots, validation, ranking normalization, availability intervals and transition rules.
- Database integration: real PostgreSQL migrations, FKs/unique/exclusion checks, multi-connection race tests, transaction rollback and outbox delivery.
- API security: cross-user/provider/case/asset negative tests; expired/revoked credentials; mass-assignment attempts; private field filtering.
- Real-time: authenticated membership, duplicate message IDs, ack timeout, reconnect catch-up, ordering/read cursors and session revocation.
- Workers: restart, lease/expiry, repeated jobs, unknown external outcomes, retry caps and dead-letter recovery.
- Provider contract tests: PayHere/Stripe signature/checksum, duplicates/late/out-of-order events; S3 ownership/finalization; SMTP/text.lk queued vs delivered; OpenAI/Gemini valid/invalid/refused/partial outputs.
- Browser end-to-end: independent customer/provider/admin accounts; full artist and rental flows; reload; unavailable dependencies; mobile/theme/keyboard; actual PDF opening and audio/video upload/playback.

### High-value acceptance scenarios

1. New DB has no fake artists/ratings/revenue; a verified provider publishes a listing and public browse sees it.
2. Customer bookmarks, drafts and messages survive reload and cannot be read by another customer.
3. Two simultaneous bookings for the last equipment unit yield at most one valid reservation; no negative available stock.
4. Artist personal blackout conflicts with a booking decision safely; private reason is not exposed.
5. Outdated/self quotation acceptance fails; checkout cannot alter the agreed total or choose legacy advance rules.
6. Successful callback is processed once, including after browser close; wrong amounts/signatures do not mark paid.
7. A charge that succeeds after booking cancellation/hold expiry is recorded and reconciled without overbooking or losing the customer's money.
8. Refund and payout races cannot allocate the same funds; account changes/holds stop stale payouts; unknown external results are reconciled.
9. Out/overdue/damaged equipment is unavailable until the physical return and condition clearance, even if payment is refunded.
10. Invoice/receipt/statement, admin analytics and provider earnings agree per currency and payment environment.
11. Cancellation/reschedule invalidates both 24h and 2h reminders; queue retries/restarts do not intentionally duplicate accepted sends.
12. Weight/prompt changes affect actual recommendation/generation version; metrics show measured calls, never fixture constants.
13. All production mutations can be traced to a real user/service identity and durable event; reset/demo actions are not reachable.
14. Backup restore plus outbox/job reconciliation restores consistent booking/financial state.

### Feature sign-off checklist

A feature is done only when schema/migration, API/events, authorization, domain rules, UI integration, hardcode removal, error/loading states, relevant provider capability, tests and checkpoint evidence are complete. Tests with a fake adapter prove internal logic, not a live external integration. Label development DB, local test provider, external sandbox and live production separately in progress.

## 12. Ownership and integration responsibilities

| Lead from proposal | Primary backend ownership | Shared integration |
|---|---|---|
| Kodikara — Module 1 | Customer identity/profile, public discovery, event briefs, saved/review consumer flows | Authentication foundation, matching inputs and booking/review eligibility |
| Pabara — Module 2 | Artist profile/gigs/packages/portfolio/availability | Media service, provider reservations and AI generation consumer |
| Disanayaka — Module 3 | Renter storefront, equipment/venue/rate plans, serialized stock, inspection/deposit operations | Booking reservations and financial deposit/refund services |
| Hesitha — Module 4 | Booking FSM, inquiries/chat, versioned quotes/agreements, payments/ledger/documents and saved transaction entry points | Every catalog/availability provider and administrator decision |
| Hettiarachchi — Module 5 | Admin permissions/reviews/disputes, central AI/metrics, notifications/reminders/system/analytics | Shared audit/outbox and authorized financial execution |

Ownership does not imply agents or students will work in parallel without coordination. Shared contracts and database changes have one reviewed owner per ticket; no member creates a second incompatible users/bookings/payment table.

## 13. External setup and decision register

These are feature gates, not requests to paste secrets into chat. Create sanitized environment examples; real credentials use local ignored files and deployment secret storage. No provider account signup, outbound customer message, charged model call, payment or production deployment occurs during planning.

| Requirement | Needed by | Work possible before it exists |
|---|---|---|
| Separate final report, if different | P00 | Current plan and UI/domain mapping; revise explicit technology/requirements differences |
| Approved runtime/tooling versions | P00/P01 | Contract/schema design |
| PostgreSQL + Redis development setup | P01 | Local Docker setup; isolated CI containers |
| Domain/origins and SMTP sender | P02/P17 | Local mail catcher and token flow tests; production email remains unconfigured |
| S3 bucket, region, scoped application identity and CORS | P04 | Asset contracts and local test adapter; public evidence is never a fallback |
| PayHere merchant sandbox and approved domain/currency/capabilities | P11/P12 | Journal/order/reconciliation domain tests; actual collection/payout remains pending |
| Eligible Stripe/Connect sandbox setup | P11/P12 | Provider-neutral adapter contract and signed fixture tests; no unsupported-country promise |
| Payout/holding/deposit capability decision | Before money activation | Review UI expectations and journal accounting; disable unsupported actions honestly |
| OpenAI/Gemini service key/model budget | P15 | Request/schema/evaluation/prompt-version tests; integration readiness remains false |
| Embedding model and approved equipment facts/source catalog | P15 | Exact/filter-based matching and unknown-field response; semantic/spec claims pending |
| text.lk credentials/sender and SMTP transactional setup | P17 | Outbox/scheduler/dedup tests; no fake delivery success |
| Document issuer/tax settings, booking/refund/deposit terms | P09/P13 | Demo documents and model design; real issuance gated on configured facts |
| Signing requirements and image-diff expectations | P00/P14 | Authenticated acknowledgment/hash evidence and reviewed photo comparison; stronger claims require matching implementation |
| AWS staging account/region/domain and CI deployment identity | P18 | Local containers/CI image builds; no automatic public deployment |

## 14. First implementation milestone

Start with **P00 + P01**, then **P02**. The first reviewable result should be a backend branch with reproducible API/PostgreSQL/Redis/worker infrastructure, migrations, contracts and health checks, followed by persistent real accounts and sessions. This makes later per-user data meaningful and prevents investing in more role-global fixtures.

Do not start by connecting the existing “Pay” button to a gateway or by copying all current seed objects into database tables. First establish identity, catalog and reservation truth, then agreement and money commands.

The next implementation request can be: “Start P00 and P01 from this plan on the backend branch.” The branch creation, source edits and dependencies belong to that implementation step, not to this planning deliverable.

## 15. Reference documentation used for design checks

The supplied proposal is the requirement source. The links below support technical design details, not evidence of services already running in StageLink. Recommendations about topology/tooling are design decisions in this plan.

- NestJS: https://docs.nestjs.com/
- PostgreSQL locks: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL ranges/exclusion: https://www.postgresql.org/docs/current/rangetypes.html
- Prisma transactions: https://www.prisma.io/docs/orm/fundamentals/transactions
- Socket.IO delivery guarantees: https://socket.io/docs/v4/delivery-guarantees/
- Socket.IO Redis adapter: https://socket.io/docs/v4/redis-adapter/
- BullMQ delayed jobs: https://docs.bullmq.io/guide/jobs/delayed
- BullMQ idempotent jobs: https://docs.bullmq.io/patterns/idempotent-jobs
- FastAPI: https://fastapi.tiangolo.com/
- AWS S3 presigned access: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- PayHere Checkout: https://support.payhere.lk/api-%26-mobile-sdk/checkout-api
- Stripe webhooks: https://docs.stripe.com/webhooks
- Stripe charge/transfer topology: https://docs.stripe.com/connect/separate-charges-and-transfers
- Nodemailer SMTP: https://nodemailer.com/smtp
- text.lk API: https://text.lk/docs/sms-api-endpoints/
- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
