# StageLink checkout demo

This is a frontend-only booking and payment simulation. No backend, real bank
account, card charge or transfer is connected. The role switcher models the
customer, artist and admin workflows; it is not authentication.

## Try the complete flow

1. Switch to **Customer → Open Chat**. Accept Aria's quote, or submit a counter
   offer and use **Artist → Open Chat** to accept it first.
2. The customer opens **Checkout → Use demo card → PAY**. Focusing CVV flips the
   card. The form fades, the card centers, and the processing state lasts about
   2.5 seconds before success. Leaving checkout while processing cancels the demo.
3. **View booking** shows the funds held by StageLink. Checkout charges the full
   agreed performance fee plus the existing 5% service fee; no deposit schedule.
4. Switch to **Artist → Earnings → Mark performance complete**. The tracker in
   the artist's chat offers the same action.
5. Switch to **Administrator → Payments**. Confirm that the performance was
   verified, then release the payout and confirm. The singer receives the agreed
   performance fee; StageLink retains the service fee. A payout hold blocks release.

The amount is sourced from the accepted quotation, rather than the design's
sample $1,234. The checkout uses StageLink’s dark violet and amber palette with translucent,
reflective glass surfaces. The breadcrumb uses “Booking details” because a performance has
no shipping step. Existing dashboard palettes and landing/login views are preserved.

## Implementation and checks

- `src/components/PaymentCheckout.tsx` contains the responsive card, form, flip,
  form/processing/success animation, reduced-motion handling and field feedback.
- `src/lib/booking.ts` guards quote/payment/performance/payout transitions.
- `src/lib/BookingContext.tsx` shares demo state across roles and refreshes. It
  stores domain events only under `stagelink:demo-booking:v1` in local storage.
  Cardholder name, card number, expiry and CVV are never stored or sent anywhere.
- `src/components/AdminPayments.tsx` contains verification, payout hold, release
  confirmation and the activity ledger.

Run `pnpm test` (Node 22.6+), `pnpm typecheck`, and `pnpm build`.
To repeat the demo from scratch, remove only `stagelink:demo-booking:v1` from
this preview origin's local storage, then reload. Keep `node_modules` in the
working project.
