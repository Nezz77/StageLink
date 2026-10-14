# StageLink payment and overtime demo

All customer payments enter the StageLink holding account. Only an administrator can transfer held funds to the provider's linked bank account. This is a temporary frontend simulation: no real bank account, payment processor or transfer service is connected.

## Agreed payment rules

- The customer may pay an optional **10% advance** after the booking price is agreed, or skip it.
- The advance remains held by StageLink until an admin explicitly transfers it. This transfer is allowed before the performance.
- StageLink deducts **5% of the original booking price once** from the provider's first payout. The customer is not charged an additional service fee.
- The provider reports completion after the scheduled end, including approved overtime. The customer then owes the remaining **90%**, or **100% if no advance was paid**, plus approved overtime, immediately through StageLink.
- The final payment is also held by StageLink. The admin verifies completion and confirms the final transfer. If the fee was deducted from the advance, the final transfer has **no additional fee**.
- If both payments are still held, release the advance first so it carries the one-time fee. An admin review hold or pending refund blocks transfers.
- Either the customer or performer may request overtime once the gig starts, with extra minutes and a proposed price. The other party must approve or decline it. A pending proposal blocks final checkout; rejected proposals add nothing. Final payment closes overtime changes.
- The fee remains based on the original booking price. Approved overtime goes to the performer without an additional fee.

Example: a **$2,250** booking with **$400** approved overtime. The customer pays a $225 advance. The admin deducts $112.50 once and transfers $112.50 before the gig. After the performance, the customer pays $2,425 ($2,025 balance + $400 overtime). The admin then transfers all $2,425. Total customer payment: $2,650. Total performer payout: $2,537.50. StageLink fee: $112.50.

## Walk through the UI

1. **Customer → My bookings → TechVentures Corporate Gala → Agree to booking price**. Choose **Pay 10% advance**, or **Skip advance · pay after gig**.
2. Checkout offers **Demo card → Use demo card** or **Demo wallet**. The summary identifies the installment, approved overtime, prior payments and the exact amount due. Card fields stay in component memory and are never persisted.
3. To preview failure, use test card **4000 0000 0000 0002**, a future expiry and a three-digit demo CVV. The failed attempt records no payment.
4. **Administrator → Payments** opens the settlement desk. Select any booking, inspect held funds and use **Transfer advance**. Review the gross amount, fee and provider payout, then confirm the demo transfer.
5. During or after the gig, **Customer/Artist → Booking desk → booking → Request overtime**. Enter the extra minutes and price. Switch to the other participant to approve or decline the request.
6. **Artist → Booking desk → booking → Mark event complete** becomes available after the scheduled end plus approved overtime. Completion is possible without an advance.
7. **Customer → booking → Pay final balance**. The final bill subtracts the advance and adds approved overtime. All of it enters StageLink's holding account.
8. **Administrator → Payments → booking**. Verify the performance, then confirm **Transfer final payment**. An already-deducted fee is shown as zero for this transfer.
9. **Payment details** shows separate advance/final transaction entries, transfer dates, fee deductions, remaining balance and a downloadable receipt. Eligible refunds can be requested before the event while funds are still held.

The seeded event dates are fixed demo fixtures. To test upcoming/completed states automatically, the browser checks use isolated profiles and simulated dates; they do not change the system clock or a user's existing demo history.

## Temporary demo state

Every full page load starts from the original demo bookings, with **TechVentures Corporate Gala unpaid** and ready to try again. Payments, overtime, refunds, booking requests, saved drafts, messages and read indicators live only in memory for the current page. Navigating within the app or switching roles preserves that session; refreshing, closing the tab or opening a new tab starts fresh.

Old `stagelink:pipeline:v1` and `stagelink:demo-booking:v1` browser records are ignored. The app does not read, write or migrate them. It also no longer reads or writes the previous attachment database. Attachments remain downloadable during the current page session and clear on refresh. No manual browser-storage cleanup is needed.

Use the role switcher **in the same tab** for customer, performer and admin demonstrations. Tabs now run independent demo sessions. The role switcher is not authentication; production still requires server-enforced permissions, payment-provider integration and verified bank accounts. Historical event replay helpers remain available for domain tests, but are not used when the app loads.

## Validation

Run `pnpm typecheck`, `pnpm test` and `pnpm build`. Tests cover installment amounts and rounding, once-only fees, no-advance completion, overtime authorization, pending and stale checkout, duplicate charges/transfers, payout holds, refund blocking and historical replay. The existing booking and chat checks remain in the domain suite.

See [FRONTEND_WORKFLOWS.md](FRONTEND_WORKFLOWS.md) for the wider booking/chat UI walkthrough.
