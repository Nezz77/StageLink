# Connected account UI and validation

The account modal uses the backend selected by `VITE_STAGELINK_API_ORIGIN`. Account identity, memberships, sign-in, registration, role switching, verification, password recovery and logout are persistent. Bookings, payments and other dashboard data are still explicitly marked as previews.

## User journeys

- Sign-in opens the workspace for the server's active role. The account menu shows existing memberships only.
- Registration creates an account request and returns to sign-in with a uniform notice. It does not invent a session.
- Refresh restores the HTTP-only cookie. Account state is copied into memory; credentials are absent from local/session storage.
- Email links are removed from the address bar before rendering. Confirmation requires a deliberate action. Same-page links and replayed links are handled as separate actions.
- Recovery requests a real email, exchanges its token for a short-lived grant, then changes the password. Password and confirmed email changes revoke old sessions.
- The account menu supports sign-out. Backend failure is visible; it cannot create a successful login.
- Desktop, mobile, short landscape, dark/light, loading, invalid credentials and unavailable-service states were reviewed. Keyboard focus stays in the modal and Escape closes it.

The separately added email-settings and SMS workflows on the shared frontend branch are retained when integrating this work.

## Reproducing browser checks

Run the backend's isolated test services, migrate a disposable local database whose name ends in `_test`, and build that backend. Use Node 24 and set `STAGELINK_BACKEND_CHECKOUT` to its absolute checkout path plus the normal backend test environment. The browser runner rejects non-test or non-loopback database/Redis URLs.

Run `npm run check:authentication-ui`. Playwright must be available as a local development tool, or specify an absolute `STAGELINK_PLAYWRIGHT_MODULE` path. Optionally set `STAGELINK_CHROME_EXECUTABLE` to an installed browser and `STAGELINK_QA_OUTPUT` to an absolute output directory. Otherwise the runner uses Playwright's Chromium and a new temporary output directory.

The runner starts its own ephemeral API and Vite processes, uses an isolated browser context, seeds only synthetic `.test` accounts, blocks unrelated outgoing browser requests, and removes its accounts and rate-limit keys. It does not start outbound mail/SMS workers. Passwords are masked in captures and email tokens are not printed. Test reports verify cleanup.

Local browser evidence and screenshots are under `outputs/stagelink-authentication-2026-11-22/browser-qa` in the Software Project workspace. This is local browser validation, not a hosted API deployment test. No real provider messages or payments were sent.

Current combined results: 182 frontend tests, type checking and production build pass; all 22 browser cases pass with zero page errors and zero remaining fixture accounts. The SDK retains the public-account-only subscriptions and email-setting methods added on the shared branch.

## Figma handoff

The existing P02 account flow was refreshed in the authorized StageLINK file. Existing frame IDs were retained; additional states were added.

- [Account design](https://www.figma.com/design/T5OZJHgSNwPIXYwHnM85yj/StageLINK?node-id=504-6267)
- [Account wireframes](https://www.figma.com/design/T5OZJHgSNwPIXYwHnM85yj/StageLINK?node-id=505-23778)
- [Account prototype](https://www.figma.com/proto/T5OZJHgSNwPIXYwHnM85yj/StageLINK?page-id=60%3A1117&node-id=509-118195&starting-point-node-id=509%3A118195&scaling=scale-down)

Each page has 30 account states and 2,774 native descendants, including editable text, vectors and reusable input/button/form instances. The wireframes contain no image fills. Design/prototype image fills are discrete source backgrounds, branding, album art and profile imagery. A background-only canvas check confirmed the large dark dashboard image is an instrument texture. Full-view screenshots were reviewed and long-label/font wrapping corrected.

The prototype has 79 navigation actions, including recovery, changed-email confirmation and mobile verification results. All destinations were checked as different top-level frames on the prototype page. Existing unrelated flow entry points were preserved. These are illustrative Figma interactions; actual API behavior is validated separately in the browser.

The machine-readable frame map, native-node census and validation boundary are in [the evidence file](validation/Authentication-2026-11-22.json).

## Next integration work

Connect persistent role profiles and onboarding, then private media, marketplace data, availability, bookings, chat, payments, rental inspections and administration. Reuse existing backend permissions and validation. Remove preview data only when its replacement workflow is connected and checked.

