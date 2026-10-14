# StageLink checkout demo

The booking, payment and chat frontend now shares a persistent, browser-local workspace. See [FRONTEND_WORKFLOWS.md](FRONTEND_WORKFLOWS.md) for the complete UI checklist and walkthrough.

No real bank account, card charge, transfer, refund or network chat service is connected. The role switcher models the customer, artist, equipment renter and admin views; it is not authentication.

## Try checkout

1. Choose **Customer → My bookings**. Open **TechVentures Corporate Gala**, then **Agree to quote & checkout**. For a new booking, first send a request and accept it from the corresponding provider's Booking requests view.
2. Choose **Demo card → Use demo card**, or **Demo wallet**. Focusing CVV flips the card. Submitting shows processing, then payment confirmation. Card fields are held only in component memory and never persisted.
3. To exercise failure, use test card **4000 0000 0000 0002**, a future expiry and a three-digit test CVV. The declined attempt records no payment. Use the demo-card button to retry successfully.
4. **View booking → Payment details** shows funds held, transaction information, a downloadable text receipt and refund-request eligibility. Checkout collects the quoted amount plus the existing 5% service fee in the demo ledger.
5. A refund request pauses payout for review and remains pending; it does not automatically refund or cancel the event.

The existing admin payout demonstration still addresses **BK-2901**. After that booking's performance is reported, **Administrator → Payments** supports verification, hold and release confirmation. Other bookings expose the frontend tracking and review states; production review and payout services are still required.

## Implementation and validation

- `src/components/PaymentCheckout.tsx`: card and wallet choices, card flip, validation, processing, success, failure and reduced-motion support.
- `src/lib/booking.ts`: quotation/payment/performance/payout transitions and demo-card validation.
- `src/lib/pipeline.ts`: multi-booking state, drafts, request transitions, conflicts, refund eligibility and messages.
- `src/lib/BookingContext.tsx`: shared state across roles and tabs, event replay and storage error feedback.
- `src/components/AdminPayments.tsx`: existing BK-2901 verification, hold and release demo.

Events are now stored under `stagelink:pipeline:v1`. Existing events in `stagelink:demo-booking:v1` migrate when the new store does not exist. To intentionally reset all demo data, remove both keys from this preview origin's browser storage and reload. Attachments are separately kept in the `stagelink-chat-files` IndexedDB database.

Run `pnpm test`, `pnpm typecheck` and `pnpm build`. See the workflow guide for backend boundaries and browser validation coverage.
