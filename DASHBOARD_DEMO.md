# StageLink dashboard demo

Use the role selector in the workspace header to explore **Customer**, **Artist**, **Equipment Renter** and **Administrator**. The landing and login designs are preserved.

All changes are temporary and live in the current tab. Navigation and role switching keep them; a full page refresh starts a fresh demo. No data is stored in localStorage, sessionStorage, IndexedDB or a backend.

## Artist

- **Overview** shows current bookings, pending requests, held funds and transferred earnings from the booking ledger.
- **My Gigs** supports new gigs, editing, previews, search, status filters, publish/pause and confirmed deletion. Enter an incomplete form and choose **Save for later**; it appears under saved drafts. Draft edits do not alter a saved listing until **Save listing** succeeds.
- The gig editor includes a **template-based writing assistant**. Enter keywords, generate a demo draft and choose **Use this draft**. Review the wording before saving. No AI service is connected.
- **Portfolio** accepts JPG/PNG/WebP up to 5 MB and MP4/WebM up to 20 MB, with a maximum of 30 items. Preview, rename captions, choose the featured item or remove media. Files remain local to this tab and clear on refresh.
- **Earnings** shows actual demo transactions, held balances, net transfers and the fee already deducted. Filter the statement period, export CSV or open a linked payment.
- **Profile** supports validation, a saved draft and a saved profile preview. Saving updates the workspace identity.
- **Booking desk**, **Requests**, **Calendar** and **Messages** open the existing connected booking workflow.

## Equipment Renter

- **Overview** uses the rental bookings and payment ledger.
- **Inventory** supports adding/editing equipment, descriptions, categories, price, units, quantity, condition, maintenance status, publish/pause, search and confirmed deletion. Partial forms can be saved for later.
- **Active Rentals** filters upcoming/active and completed rentals. **Manage rental** opens the exact booking for handover coordination, messaging, demo completion and payment tracking.
- **Earnings** and **Profile** share the artist workflow, with rental-specific records and business details.

## Customer

- **Saved artists** now survives moving between the discovery page, bookings and other demo roles.
- **My profile** validates details, supports Save for later, and updates the workspace identity when saved.
- Existing discovery, booking, payments and chat navigation remains available.

## Administrator

- **Analytics** calculates customer payments, provider transfers, fees and refunds from the booking ledger. Filter by month, switch the chart metric, export a report and open activity or queues directly.
- **Verification** contains sample submissions. Open each sample document, confirm review, write a decision reason and approve or reject with confirmation. Completed decisions remain in the filtered history.
- **Disputes** provides case context, sample attachments, internal notes, demo replies, response drafts and confirmed resolutions. Open the linked payment for any money-related action. Resolving a dispute itself does not transfer or refund funds.
- **Support** supports search, open/completed filters, draft responses, demo replies, internal notes, resolution and reopening. Conversation history remains visible.
- **System** provides a confirmed maintenance-preview banner, a shared announcement, saved announcement drafts, simulated cache/session actions and an operations log. These controls affect only this demo tab; navigation stays usable.
- **Payments** retains the settlement and refund workflow. Only the administrator releases held payments.

## Suggested walkthrough

1. Artist → My Gigs → New gig. Save a partial draft, switch roles, return and resume it. Complete the fields and save; pause and publish the listing.
2. Artist → Portfolio. Upload a local image, preview it, change its caption and feature it.
3. Equipment Renter → Inventory. Add equipment with quantity and pricing; try a maintenance filter. Active Rentals → Manage rental opens the matching booking.
4. Customer → My bookings → TechVentures Corporate Gala. Agree to the price, pay the optional 10% advance with **Use demo card**, then inspect Artist → Earnings.
5. Administrator → Payments. Select BK-2901 and transfer the advance. Artist → Earnings now shows the net transfer and the one-time fee. Analytics reflects the same ledger.
6. Administrator → Verification. Review both sample documents, enter a reason and confirm a decision. Try Support → save a draft, return, add a demo reply, resolve and reopen.
7. Administrator → System. Save and publish an announcement, then switch to Customer to see it. Remove it from System when finished.
8. Refresh. Saved drafts, listings, profile edits, uploads, case decisions, controls and payment progress all reset.

## Integration boundaries

This is a frontend prototype. Role checks demonstrate allowed UI actions; they are not authentication or server authorization. Catalog edits update the management catalog in this demo. They do not modify the separate public marketplace samples, booking service options or prices already agreed on bookings. Profile edits update the dashboard identity, while existing bookings retain their seeded participant snapshots.

All payments, refunds, identity reviews, support replies and system operations are simulated. There is no live payment gateway, bank transfer, AI service, remote media upload or outbound messaging. Payment policy remains an optional 10% advance, the remaining agreed price plus approved overtime after the performance, and a 5% fee on the original booking deducted once from the provider's first payout. See [PAYMENT_DEMO.md](PAYMENT_DEMO.md).

Forms protect unsaved changes when leaving through dashboard navigation, the role selector or notification links. Use **Save for later** to preserve a draft within the current page session.

## Validation

`pnpm typecheck`, `pnpm test` and `pnpm build` validate the source, including tests for role restrictions, draft isolation, listing validation, verification decisions, case history and session reset.

Browser checks exercise the workflows above, local image upload, earnings/report downloads, the animated demo card checkout, role and navigation guards, and refresh reset. Responsive checks cover the new tabs at 390px in both light and dark themes, tablet layouts, and normal/reduced motion. The production build retains Vite's large-chunk warning; it succeeds.
