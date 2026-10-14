# StageLink booking, payments and chat

The existing landing and login pages are unchanged. The new booking workspace uses the same violet/amber glass styling, dashboard shell, typography and reduced-motion preferences.

## Open the workspace

- Choose **Customer** in the demo role switcher, then **My bookings**, **Payments** or **Messages**.
- Choose **Artist** or **Equipment Renter**, then **Booking desk**. Open **Booking requests** to review requests addressed to that role.
- The shared booking workspace includes **Booking desk**, **Calendar**, **Booking history**, **Payments** and **Messages**. Provider roles also have **Booking requests**.

## Try the connected flow

1. As Customer, choose **Create booking**. Select Aria Nova or an AudioVault equipment service, then enter the event details.
2. Choose **Save for later** at any point, even with an incomplete form. Navigate away, return to My bookings and **Resume draft**. Drafts last only until the page is refreshed or closed.
3. Review a complete form and send the request. A request is not yet a confirmed, paid booking.
4. Switch to the matching provider role in the same tab. Open Booking desk → Booking requests, review the event and accept or decline.
5. Return as Customer. Open the accepted booking and choose an optional 10% advance or skip it. Advance checkout offers a demo card or wallet.
6. Paying or skipping the advance moves the booking into Active. The admin may release a paid advance before the gig, deducting the 5% booking fee once. After completion the customer pays the balance plus approved overtime; the admin verifies the gig and transfers the final payment. See [PAYMENT_DEMO.md](PAYMENT_DEMO.md) for the full flow.
7. An eligible booking can request a refund before its start time. The request pauses payout; submitting it does not approve a refund or move funds.
8. Open Booking chat from the booking details. Messages, attachments and unread counts refer to that booking.

For a two-sided chat demonstration, switch between Customer and the appropriate provider in the **same tab**. Messages and attachments remain available while navigating and switching roles. Refreshing resets the entire demo; each new tab starts independently. The role switcher is a demonstration tool, not authentication.

## UI checklist coverage

| Screens / components | Implementation |
| --- | --- |
| Booking dashboard and status cards | Upcoming, pending, active and completed totals; searchable list and status filters |
| Create booking and confirmation | Artist/equipment selection, date/time, guests, venue, requirements, validation, price summary and request review |
| Save for Later | Multiple partial drafts, resume during the current page session and confirmed deletion |
| Booking details and status tracking | Participant information, pricing, requirements, activity timeline and status-specific actions |
| Calendar / date picker | Native date input; month navigation, daily agenda, service filters, booked dates and conflicts |
| Booking history | Completed, rejected and cancelled records with search and filters |
| Booking requests | Role-scoped review, accept, decline confirmation and scheduling validation |
| Checkout and payment feedback | Demo card or wallet selection, card validation, processing, success and retryable failure |
| Transaction history and details | Status filters, totals, linked booking, payment method and downloadable text receipt |
| Overtime and admin transfers | Customer/performer proposals, counterparty approval, final-bill adjustments, optional advance and final transfers, one fee per booking |
| Escrow and refunds | Held/released/refunded examples; eligibility checks and pending refund review state |
| Inbox and booking conversation | Search, unread filter, booking-linked messages, timestamps and local file attachments |
| Notifications | Shared header dropdown, unread indicators, open conversation and mark all as read |
| Navigation and header | Existing role shell, desktop sidebar and mobile navigation |
| Confirmation dialogs | Modal focus handling, Escape support and confirmation before cancellation, rejection or draft deletion |
| Loading / empty / error states | Payment and attachment processing, empty filters/inbox/history, form errors, and payment failure feedback |
| Motion, glass and responsive styling | Existing dashboard transitions, scoped glass panels, mobile inbox navigation, light/dark themes and reduced motion |

## Demo scope and integration boundaries

- No backend service, payment gateway, websocket service or deployment is added.
- Booking data, payments, overtime, drafts, messages and read indicators stay in memory until refresh. Old saved browser records are ignored. The admin settlement desk can select and settle every booking; general admin operations remain outside this UI scope.
- The frontend checks role, status, availability, quote version and amount before transitions. These are UI safeguards, not security controls. Production must enforce them on a server.
- Payment fields remain in component memory and are cleared after success. They are not saved in the event log. Demo wallet payments have no real balance.
- Use the **Use demo card** button for success. To preview failure, use **4000 0000 0000 0002**, a future expiry and a three-digit test CVV. No payment transition is recorded for the declined attempt.
- Refund requests remain pending until a backend/reviewer resolves them. A seeded refunded transaction illustrates the final UI state.
- Attachments stay in memory (maximum 5 MB each) and can be downloaded by either participant after switching roles in the same tab. Refresh clears them. No persistent storage or remote upload occurs.
- Tabs have independent demo sessions. Chat does not deliver messages to another tab, device or user over the network.
- The demo works without browser storage access; existing valid or corrupted stored events do not affect the initial state.
- Rates use the existing USD demo context. Calendar availability represents the demo records, not verified availability from real providers.

## Validation

Run `pnpm typecheck`, `pnpm test` and `pnpm build` in the repository. The domain suite covers draft recovery, creation, conflicts, role checks, booking transitions, payments, refund eligibility, chat read state and invalid event history, alongside the existing payment tests.

Browser QA covers payment followed by reload, ignoring an existing paid demo record, preserving progress while navigating and switching roles, session-only drafts and attachments, independent fresh tabs, and checkout when browser storage is unavailable. Screenshots and detailed QA results are retained in the working folder used for this implementation.
