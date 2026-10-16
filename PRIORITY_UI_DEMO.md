# Connected StageLink demo workflows

All eight items from the frontend priority list are now connected. This is a frontend demo: navigation and role switching preserve state in the current tab; refresh starts a clean session. Separate tabs do not share data.

## Original design restored (2026-10-16)

Browse Artists and Rent Equipment use the original stacked folder cards and fan animation again. Listing details retain the original large photo, glass tabs, gallery and booking panel. Customer Discover retains the original hero, ticket, photo cards and shortlist. These layouts still use the shared catalog and connected booking/chat/review workflows. The generic marketplace grid has been removed. Small-screen tab spacing and profile text contrast in light mode were corrected without changing the desktop layout.

## Preview the animated payment card

1. Refresh the page for a clean demo session.
2. Use the role switcher to select **Customer**.
3. Open **My bookings** and select **TechVentures Corporate Gala**.
4. Choose **Agree to booking price**, then **Pay 10% advance**.
5. Select **Use demo card** to fill the example details.
6. Focus **CVV / CVC** to flip the card; focus **Cardholder name** to turn it back.
7. Choose **PAY $225.00** to see processing and the payment success animation.

No real payment is made. Refresh to repeat. If the device has Reduce Motion enabled, the same states appear without the animated transition.

## 1. Marketplace → booking and messaging

Customer → Discover → **Find a performer**, or **Equipment** in the sidebar, shows published artist gigs and rental inventory from the provider dashboards. Open a listing and choose **Book Now** or **Request Rental** to start a booking with that service already selected. **Message** opens an existing booking conversation or creates an enquiry when there is no matching booking. Messages → **Enquiries** holds those conversations, including unread indicators and message drafts. Booking conversations continue to support attachments.

Visitors are prompted to sign in, then resume the selected booking or enquiry. Providers browsing the public marketplace confirm switching to the customer demo before creating a request. Saved listings are shared across navigation and reset on refresh.

## 2. One catalog, fixed booking prices

Artist → My Gigs and Equipment Renter → Inventory feed the customer and public browse/detail views, along with provider profile and portfolio edits. Paused, maintenance and deleted listings cannot receive new requests. A submitted booking stores its service, provider label and quote: later catalog edits cannot silently change the agreed price.

The existing landing-page promotional content remains a static design demo. Its Browse Artists and Rent Equipment pages use the connected catalog.

## 3. Payout accounts

Artist / Equipment Renter → **Payout account** supports editing, validation, masked destination summaries, Save for later, and admin-review status. The initial destinations are explicitly seeded demo accounts so the payment walkthrough remains immediately usable.

Submitting a new destination pauses transfers. Administrator → Payments → **Payout destinations** can verify or reject it with a reason. Verified accounts allow transfers; rejected accounts show the reason to the provider and can be edited and resubmitted. The transfer confirmation displays the masked destination. No bank connection is made.

The payment rules remain unchanged: optional 10% advance; admin release may happen before the event; the balance plus approved overtime is paid after performance; StageLink deducts 5% of the original booking once from the provider's first payout.

## 4. Availability and stock capacity

Artist / Equipment Renter → **Availability** sets weekdays, regular hours and up to ten blocked periods. Save for later preserves incomplete changes. New requests and provider acceptance check this schedule. Existing accepted bookings are preserved; changes must be coordinated with the customer.

Artist conflicts apply across all gigs belonging to the demo artist. Rental bookings specify a quantity, priced per unit; stock is reserved for the entire event date. The total reserved quantity cannot exceed Inventory quantity. Reducing inventory before accepting a pending request can make that request unavailable.

## 5. Provider verification

Artist / Equipment Renter → **Verification** accepts a subject, explanation and two to five sample documents. Use PNG, JPEG or PDF, up to 5 MB each. The demo limits each role to 20 uploaded evidence files per session. Drafts retain references to uploaded files until refresh.

Administrator → Verification receives the submission and can preview the actual attached files, reply, and approve or reject with a reason. Providers see decisions and public replies; internal notes remain hidden. Rejected submissions can be resubmitted while retaining previous review history. Approved profiles receive a demo-reviewed label in the marketplace and dashboard.

## 6. Support and disputes

Customer / Artist / Equipment Renter → **Help & disputes** offers support requests and booking disputes. Disputes require a booking; support can optionally link one. Attach sample evidence, save a partial draft, submit, and exchange replies with the admin in the same tab.

Administrator → Support / Disputes receives these cases. Internal notes remain admin-only in the UI. Resolution records an outcome; it does not move funds. Use **Review linked payment** for separate payment actions.

## 7. Recovery and email verification

Landing page → **Log in** → **Forgot your password?** demonstrates email entry, a code, password/confirmation validation and success feedback. The displayed demo code is **246810**, valid for five minutes. No email is sent and no real password is changed.

Customer / Provider → Profile → **Email verification** verifies the saved profile email using the same displayed demo code. Editing the saved address requires a new verification. Login and landing visual designs are preserved. Social sign-in remains an integration placeholder.

## 8. Completed-booking reviews

Customer → My bookings → Booking history → a completed booking shows a review form. Choose one to five stars, write a review, save it for later or submit it. Each completed booking permits one customer review. The matching listing updates its displayed rating and Reviews tab immediately in the demo session.

## Validation and remaining production work

Design restoration (2026-10-16): typecheck, production build, all 54 automated domain tests, 10 restoration/payment browser checks, and 3 final visual/navigation checks passed. Original folder motion, desktop layouts, 320/390px mobile layouts, light-theme profile contrast, payment-card front/back transitions, demo success and reset-on-refresh were checked.

Typechecking, the production build and 54 automated domain tests pass. Browser checks cover the eight connected workflows, role transitions, draft recovery, document previews, payment gates, public sign-in routing, rental capacity, mobile light/dark layouts and refresh reset. Twenty new browser checks and ten payment/refund/overtime regression checks passed.

The build still reports the existing Node `module.register()` deprecation and Vite chunk-size warning. Backend authentication/authorization, database storage, uploads, live messages, email, payment collection, bank transfers and cross-device synchronization remain separate production integrations. Current frontend role checks are demonstration safeguards, not security controls.
