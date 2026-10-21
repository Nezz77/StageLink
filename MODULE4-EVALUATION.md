# StageLink Module 4 — Implementation & Evaluation

Updated: 21 October 2026 (QA performed 19–20 October). Owner: Nesandu Hesitha. Target: `/Users/nezz/Desktop/Git/Antigravity/StageLink_UI`.

This is a connected **frontend demonstration** built on the existing React 19, TypeScript, Vite and Tailwind application. It does not process money, authenticate real users or send remote messages.

## Completed functionality

- **Booking negotiations:** itemised provider quotations and customer counteroffers in the active booking chat, version history, accepted/declined/superseded outcomes, scoped participants, saved quotation drafts and a single booking ledger. Acceptance updates the booking price and checkout. Own offers, stale versions, duplicates, invalid amounts, unavailable dates/capacity and locked negotiations are rejected.
- **Saved items:** current artist/gig and rental listings, stable catalog IDs, category filters, provider/title search, details, direct booking, removal and unavailable/deleted handling. Saving is distinct from drafts and does not reserve inventory.
- **Documents:** browser-generated PDF customer invoices, individual payment receipts and separate provider settlement statements. Readable previews, current balances, overtime, refunds, transaction references and demo labels. Provider fees are not additional customer charges.
- **Chat:** booking-linked messages and shared per-participant message drafts, existing enquiries, local attachment downloads plus raster image previews. Explicit demo controls simulate typing, incoming replies, unread and seen states. Timers/object URLs are cleaned up; no online/presence claims.
- **Progress:** separate event and payment milestones, participant/timestamp activity, rejection/cancellation, declined quotation, skipped advance, failed payment, pending overtime, refund outcomes and payout holds.
- **Notifications/reset:** booking/payment/quotation/message updates open the relevant record or thread. Counts use notification read state; reading chat clears its related updates. A confirmed reset remounts the connected stores and clears attachments, catalog changes, drafts and saved items.
- **Compatibility:** the old BookingChat entry now opens the same BookingWorkspace rather than an independent ledger/demo.

## Financial rules retained

Money is calculated in integer cents. Standard agreed bookings retain an optional 10% advance. Accepting a formal quotation requires a 50% demo escrow advance; it cannot be skipped, the event cannot start before it is paid, and it remains held until completion is verified and the full balance is collected. All collections remain held until an administrator transfers them. The first payout deducts the 5% StageLink fee from the original agreed price; later payouts deduct no further fee. For a $2,000 quoted booking with $300 approved overtime, the 50% advance is $1,000 and the final customer payment is $1,300 ($2,000 − $1,000 + $300). The provider receives $2,300 total, less the one-time $100 fee. Approved overtime does not increase the fee.

Without an advance, the original price plus approved overtime is due after completion. Pending overtime blocks final checkout. Final release requires admin completion verification. Refund review, active holds, unverified bank destinations and duplicate actions block releases. An unreleased advance must settle before the final installment.

Historical seeded records retain their old demo surcharge explicitly labelled as historical. New transactions never add that surcharge. BK-2901 and BK-2902 use dates relative to the current day (+14/+18 days); fixed past records remain historical examples.

## Exact evaluation walkthrough

Use the role selector in the dashboard header. Navigation and switching roles retain the same tab's state. Avoid refresh until a scenario is finished. `Reset demo` → `Reset all demo data` starts over; `Go back` cancels reset.

### A. Quotation → counteroffer → advance → overtime → settlement

1. Choose **Artist** → **Messages**. Select **TechVentures Corporate Gala** (BK-2901).
2. Choose **Create quotation**. Set **Charge 1 price** to `2200`, edit service/inclusions/notes if desired, and choose **Send quotation**. Use **Save for later** to demonstrate an unfinished quotation.
3. Switch to **Customer**. Open **Notifications** and the **Provider quotation v2** update (or **Messages** → the gala). The new offer has **Accept offer**, **Counteroffer**, **Decline offer**; the superseded version has none.
4. Choose **Counteroffer**, set **Charge 1 price** to `2000`, then **Send counteroffer**.
5. Switch to **Artist** → **Messages** → gala → **Accept offer** on v3. An own offer cannot be accepted; accepted and superseded cards have no acceptance button. Accepting the quotation requires a 50% demo escrow advance.
6. Switch to **Customer**. Choose **Pay 50% Escrow** on the accepted quotation, or **View booking & payment**, then pay the required **$1,000.00** advance. It cannot be skipped.
7. **Use demo card** fills safe test details. To test decline, change **Card number** to `4000 0000 0000 0002` and choose **PAY $1,000.00**. No funds are recorded. Choose **Use demo card** again, then **PAY $1,000.00** to succeed. **Demo wallet** is another simulated method. CVV focus flips the animated card. The advance remains held in demo escrow.
8. Choose **View booking**. Under **Invoices & receipts**, use **Preview** or **PDF**. Downloads are labelled `StageLink-INV-BK-2901-V3-DEMO.pdf` and `StageLink-RCT-BK-2901-ADVANCE-DEMO.pdf`.
9. Switch to **Administrator** → **Payments**. Select the gala in **Booking to settle**. **Place payout on hold** disables transfer; **Clear payout hold** restores eligibility. The escrow advance cannot be transferred while completion or the final payment is outstanding.
10. Switch to **Artist** → the gala booking → **Start demo event** → **Request overtime**. Enter `60` minutes and `300` in **Overtime amount (USD)** → **Send overtime request**. Completion/final checkout remain blocked while approval is pending.
11. Switch to **Customer**. Open the overtime notification → **Approve overtime · $300.00**.
12. Switch to **Artist** → gala → **Finish demo event**, then confirm **Finish demo event** in the dialog. Completion and payout are separate milestones.
13. Switch to **Customer**, open the completion notification → **Pay final balance · $1,300.00**. Choose **Demo wallet** or **Use demo card**, then **PAY $1,300.00**.
14. Switch to **Administrator** → **Payments** → gala. The transfers remain disabled until **I have verified that the performance was completed.** is checked and **Confirm performance** is selected.
15. Transfer the **$1,000.00 advance** and then the **$1,300.00 final payment**, confirming each demo transfer. Confirm $2,300 total provider payout, $100 total StageLink fee and $0 held. Download the separate **Provider settlement statement** PDF.

### B. Skip advance

Reset, choose **Customer** → **My bookings** → gala → **Agree to booking price** → **Skip advance · pay after gig**. As **Artist**, open the gala, choose **Start demo event**, then **Finish demo event** and confirm. As **Customer**, the final balance is the full $2,250 (without overtime). It is held after payment and needs admin verification and transfer; the one-time fee is $112.50.

### C. Saved artist and rental items

As **Customer**, use the heart controls on **Discover**, or **Browse all artists** / **Browse all equipment** → **Save item** on a listing. Open **Saved items**. Try **All items**, **Artists & gigs**, **Equipment**, **Unavailable**, and **Search saved items**. Use **View details**, **Start booking** / **Start rental booking**, and **Remove**. The booking form selects the matching listing; booking is only created after **Review booking** and **Send booking request**. **Save for later** stores a draft without submitting.

To exercise unavailable handling, save a listing, switch to its provider, pause/remove it in the provider catalog, then switch back to **Customer** → **Saved items**. Its reference remains removable; booking is unavailable. Pausing an item must not create a reservation.

### D. Chat states and attachments

Open **Messages** → **Booking conversations** → a booking. Expand **Chat demonstration controls**. Use **Simulate typing**, edit **Demo incoming reply**, then **Simulate incoming reply**. The sender is the other participant of that booking. The unread state is held visibly for demonstration; **Read this conversation** clears it. Send a normal message with **Send message**, then **Simulate seen**. **Demonstrate unread** restores the unread example. Notifications open the same conversation.

Use **Add attachment** to select a local file under 5 MB. Raster images get a preview; sent files have **Download**. Files stay in this browser page only. An unsent attachment must be sent before leaving; message text has **Save for later**. Existing pre-booking **Enquiries** remain available separately and do not create a booking or payment. Demo typing controls are on booking conversations.

### E. Refund and payout restrictions

Reset. As **Customer**, agree the gala and collect its advance, but do not start the event or release the advance. Open **Payment details** → **Request a refund** → enter **Reason for refund** → **Submit refund request**. As **Administrator**, choose it in **Refund requests**, enter **Decision reason**, and choose **Approve refund · $225.00** → **Confirm demo refund**. Transfers stay blocked during review; approval refunds held funds, cancels the booking, records the decision and updates PDFs. Alternatively **Decline refund** → **Confirm refund decline** resumes the booking and preserves any prior admin hold.

Provider **Payout account** changes require admin review. A pending/rejected destination blocks transfer even with held funds. After the advance has already been released or the event has started, the refund action is unavailable under the demo policy.

### F. Session and layout checks

Switch roles without refreshing to see the same quotation/payment/message data. Cancel a reset and confirm it retains data; confirm a reset and verify saved items, custom messages and payments clear. Refresh starts another fresh demo. Open a second tab: it has independent seed data. Theme/sidebar controls should remain usable on desktop and narrow mobile screens, with keyboard focus retained in dialogs and reduced-motion settings respected.

## Verification evidence

- Applied to the main project, with the user's concurrent styling and mobile navigation changes preserved. File backups and guarded hashes were saved before promotion.
- TypeScript: passed in the updated main project.
- Domain tests in the updated main project: **69 passed**, including 14 new Module 4 tests. Coverage includes stale/own/duplicate offers, current checkout amounts, availability, skipped advance, overtime, once-only fee, refunds, saved references, scoped chat simulations, acceptance notification reads and isolated initialization.
- Production build: passed in the updated main project. Vite reports existing large application/3D chunks and a Node deprecation warning. PDF code is lazy loaded. No deployment was performed.
- Browser completed: provider $2,200 quote → customer $2,000 counteroffer → provider acceptance; old/own action buttons absent; updated $200 checkout; declined card unchanged ledger and successful retry; hold blocks transfer; advance release; pending OT gate; $300 approved OT; event completion; $2,100 final collection; final release blocked until verification; final release with no further fee; notifications opened corresponding quote/event/booking records; role switching retained progress throughout.
- Actual browser PDF downloads: invoice (2 pages), advance receipt (3), completed provider settlement (3). Extracted totals matched live state and all eight pages were rendered and visually inspected. Separate long-text fixtures (3/4/4 pages) exercised wrapping and pagination; all eleven pages were rendered and inspected.
- Final log review found a duplicate React key between the new quote editor and demo controls; distinct keys now fix it. Development hot updates also produced a transient context-provider error and existing splash/view-transition `flushSync` warnings. A fresh-load browser smoke check is still required after re-enabling browser access; production compilation passes, but console-clean runtime is not claimed.
- **Remaining browser checks:** saved-item interactions; skipped-advance and refund UI walkthroughs; chat demo controls and local attachment preview/download; explicit refresh/reset and second-tab isolation; mobile and both themes; final post-promotion smoke check. Browser control became disabled in Work settings during QA. Domain checks pass for these rules, but that is not a substitute for the remaining browser validation.

Evidence lives under `/Users/nezz/Desktop/UOM/Software Project/work/stagelink-module4/qa`: test/typecheck/build logs, baseline and promotion manifest, reconciliation record, downloaded PDF copies, extracted text, rendered pages, and long-text fixtures. No successful visual browser check is claimed for the post-QA polishing changes until browser access is available again.

## Main code map

| Purpose | Files relative to project root |
|---|---|
| Booking records, quotations, notifications, chat read/draft state | `src/lib/pipeline.ts`, `src/lib/quotations.ts` |
| Existing integer-money payment domain | `src/lib/booking.ts` |
| Shared booking/cross-role context | `src/lib/BookingContext.tsx` |
| Current catalog saved references | `src/lib/community.ts`, `src/components/SavedItems.tsx`, `SaveListingButton.tsx` |
| Negotiation and message UI | `src/components/PipelineChat.tsx`, `QuotationCard.tsx`, `ChatDemoControls.tsx`, `AttachmentPreview.tsx` |
| Document data and PDF output | `src/lib/bookingDocuments.ts`, `documentPdf.ts`, `src/components/BookingDocuments.tsx` |
| Progress, checkout, settlement, reset | `src/components/BookingMilestones.tsx`, `BookingWorkspace.tsx`, `PaymentCheckout.tsx`, `AdminPayments.tsx`, `DemoReset.tsx` |
| Shared integration | `src/App.tsx`, `DashboardShell.tsx`, `NotificationCenter.tsx`, `src/module4.css` |
| New domain tests | `tests/module4.test.mjs` |

PDF dependency: pinned **jsPDF 4.2.1**, with local Noto Sans regular/bold fonts and the SIL OFL license in `public/fonts`. See [jsPDF's official repository](https://github.com/parallax/jsPDF) and [release notes](https://github.com/parallax/jsPDF/releases). Noto Sans covers the supplied English/Latin sample content; arbitrary scripts and emoji are not guaranteed in PDFs without additional font/shaping support.

## Remaining production integrations / limitations

- Secure authentication, account ownership, server authorization and record-level participant access. Frontend role switching is a demonstration, not a security boundary.
- Durable database records and audited server transactions; atomic quote/version acceptance, capacity reservations, currency/rounding validation and idempotent payment/refund/payout operations.
- Payment gateway checkout/webhooks, reconciliation, bank destination verification and compliant custody/transfer processing. No bank account or live gateway is connected.
- Realtime messaging, authenticated subscriptions, real presence/read receipts, delivery retries, notifications and email/SMS delivery.
- Object storage, upload scanning/type enforcement, access-controlled attachment delivery and retention. Current files are local and lost on reload.
- Production invoice/tax rules, immutable document numbering and archival. Current PDFs are explicitly demonstration documents, generated on demand from the current session.
- Real identities and independent participant accounts, live stock/availability and time-zone handling. The demo has one customer and one account per provider role.
- No persistence was introduced. Refresh intentionally resets; acceptance locks the agreed base price and only approved overtime can add to it. Multi-currency, partial refunds and reopening an accepted agreement are outside the current demo rules.
