# Backend API connection foundation

This branch provides shared JSON transport and session handling for replacing demo data. The main authentication modal, account restoration, memberships and recovery are now connected; dashboard activity remains a labelled preview. See [the account handoff](Backend-Authentication.md). The standalone SMS opt-out page preserves its existing scoped bearer-only session and reuses the shared API origin parser.

Set `VITE_STAGELINK_API_ORIGIN` in an ignored `.env.local` before starting Vite, for example `http://localhost:4000` for local development. Use HTTPS in staging. This setting is an origin with no API path, query or credentials. Never put backend signing, database, payment or provider secrets in Vite variables. The frontend origin must match the backend's `WEB_ORIGIN` exactly.

Refresh uses the backend's HTTP-only cookie. Local frontend and API URLs should use the same hostname, such as `localhost` on different ports. Hosted origins must satisfy the backend's existing SameSite cookie policy; unrelated frontend/API sites will not provide cookie restoration merely by enabling CORS. No cookie policy is weakened here.

`createApiSession(origin)` offers sign-in, registration, current-account reads, role changes, cookie restore/refresh, logout and copied in-memory snapshots. `configuredSessionApi` is null without a valid configured origin; it does not invent a connection or a user. Tokens and passwords are never stored in browser persistence. Registration returns the accepted response and does not create a signed-in UI state.

The transport sends cookies only to its fixed API origin, rejects unsafe relative paths, includes CSRF for authenticated mutations and rejects redirects. It returns structured errors with bounded public messages and request references, and does not replay writes after errors. Account and session responses are validated before applying them. Server roles are authoritative.

Simultaneous refresh requests share one operation. Cookie-changing actions are serialized, and a generation check prevents stale login, account or refresh responses from restoring an obsolete local session. Logout clears memory immediately; server failure is still reported. A new page restores from the HTTP-only cookie rather than browser storage. Where available, [Web Locks](https://www.w3.org/TR/web-locks/) serialize cookie actions across clients sharing the same frontend origin. Without that API, serialization is limited to the client instance; applications must handle session expiry from server responses. A denied coordination request is reported rather than silently bypassing the lock.

The main UI restores on startup, renders the returned account, and sends role changes to the server. Route-level permissions remain enforced by the backend. Other workflows should add validated business clients over `createApiTransport`, with loading, empty and failure states. Binary media and PDF downloads require their own private capability flow; the JSON transport is not a file uploader.

## Verification

Run `npm test`, `npm run typecheck` and `npm run build`. GitHub checks use Node 24.22.1 and pnpm 10.34.3, with Git LFS assets checked out for embedded-font PDF tests. The existing project tooling also lists Node 22; the connection work was locally checked on the backend's Node 24 runtime.

`npm run check:api-session` exercises this frontend client against the real local Nest API. Set `STAGELINK_BACKEND_CHECKOUT` to an absolute built StageLink backend checkout, `NODE_ENV=test`, and the backend test environment. PostgreSQL must be migrated, loopback-only and have a database name ending `_test`; Redis must also be loopback-only. Use a disposable test database. The command starts an ephemeral API, creates one synthetic account, tests sign-in/account/role/refresh/logout and token revocation, then removes its account and rate-limit keys. It sends no external message. The cookie jar emulates browser cookie handling for HTTP checks; it is not a browser or hosted proxy test.

Current combined evidence: all 182 frontend tests pass, type checking and production build pass, and 22 local browser checks confirm account, recovery, role, multi-tab, email-settings and responsive states with zero remaining fixture accounts. The account Figma design, wireframes and prototype contain 30 states and 79 navigation actions. Persistent profile and business-data integration remains next.
