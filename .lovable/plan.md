
# Deepen the Mailchimp integration (7 steps)

This is a fairly large change touching several purchase flows, one new webhook edge function, one new admin tab, and a small schema addition. I'll do it in one pass but ship it in the order below so each step stands on its own. Everything continues to fail silently on the front end — Mailchimp errors never block a sale, donation, or account action.

## What you'll get

1. **Auto-tagging on every real interaction.** Ticket buyers (guest + logged-in), donors, film-pass purchasers, and DVD renters get tagged in Mailchimp the moment the transaction succeeds. Tags: `ticket-buyer`, `donor`, `film-pass`, `dvd-renter`, plus `source:<flow>` (e.g. `source:guest-checkout`, `source:donation`).
2. **Two-way opt-in sync.** Toggling the marketing checkbox off in Profile now unsubscribes the contact in Mailchimp (currently only subscribing is synced). Same email address, no orphans.
3. **Merge fields for segmentation.** Every sync sends `LTV_TICKETS`, `LTV_DONATIONS`, `LAST_PURCH` (last purchase date), and `FAV_GENRE` (most-frequented film genre) so you can build "lapsed donors," "big spenders," "horror fans," etc. as Mailchimp segments.
4. **Interest groups by production type.** A new Mailchimp interest category "Programming" with groups `Films`, `Live Performances`, `Special Events`, `Backstage` gets populated automatically based on what a contact has actually bought.
5. **Inbound webhook `mailchimp-webhook`.** Mailchimp posts subscribe/unsubscribe/profile events here and we mirror them into the `profiles.marketing_opt_in` column, so if someone unsubscribes from an email footer, our DB reflects it.
6. **E-commerce sync of ticket purchases.** Each ticket becomes a Mailchimp store order line (showing title + price) so their built-in "product recommendations" and "purchase-based automations" work.
7. **Admin campaign trigger.** A new "Email Campaign" button on each showing in the admin dashboard opens a Mailchimp campaign draft prefilled with the poster, title, description, and buy link. Admin finishes the send in Mailchimp.

## Files touched

**Edge functions (new / edited)**
- `supabase/functions/mailchimp-subscribe/index.ts` — accept `merge_fields`, `interests`, and `unsubscribe: true`; forward all to Mailchimp.
- `supabase/functions/mailchimp-webhook/index.ts` — NEW. Public POST endpoint (`verify_jwt=false`) that validates Mailchimp's shared-secret query param and updates `profiles.marketing_opt_in`.
- `supabase/functions/mailchimp-ecommerce/index.ts` — NEW. Called after ticket/donation/DVD/pass purchases; upserts the customer + order in the Mailchimp store.
- `supabase/functions/mailchimp-campaign/index.ts` — NEW. Admin-only (JWT + `admin` role); creates a Mailchimp campaign draft for a showing and returns the edit URL.
- `supabase/functions/mailchimp-bootstrap/index.ts` — NEW, one-time admin call. Creates the "Programming" interest category + groups and the e-commerce store if missing, so nothing has to be clicked in Mailchimp.
- `supabase/functions/guest-checkout/index.ts` — after successful ticket insert, fire `mailchimp-subscribe` (tag + merge fields + interests) and `mailchimp-ecommerce`.
- `supabase/functions/square-donation/index.ts` — after successful payment, fire `mailchimp-subscribe` (`donor` tag, updated LTV).

**Frontend**
- `src/lib/mailchimp.ts` — extend `SubscribeArgs` with `merge_fields`, `interests`, `unsubscribe`; add `syncMailchimpProfile(userId)` helper that recomputes LTV / last purchase / genre / interests from the DB and pushes them. This is the single call site all flows use.
- `src/pages/Profile.tsx` — on save, if opt-in toggled off, call `syncMailchimpProfile` with `unsubscribe: true`; if on, refresh merge fields too.
- `src/lib/booking.ts` (authenticated ticket purchase path) — call `syncMailchimpProfile` after successful ticket insert.
- `src/pages/Donate.tsx` — call `syncMailchimpProfile` after successful donation.
- `src/pages/Dvds.tsx` — call `syncMailchimpProfile` after rental checkout.
- `src/components/pos/FilmPassPOS.tsx` — call `syncMailchimpProfile` after pass purchase.
- `src/components/admin/` — NEW `MailchimpTab.tsx` mounted in `AdminDashboard.tsx`: "Sync all contacts now" button, "Bootstrap Mailchimp store & interests" button, and per-upcoming-showing "Draft campaign" button.

**Schema**
- One migration adding `profiles.mailchimp_interest_ids jsonb` (cache of the interest-category group IDs we resolved at bootstrap; avoids re-fetching every send) and `profiles.mailchimp_last_synced_at` if not already present.

## Technical details

- **Merge field computation** happens in a `syncMailchimpProfile(userId)` helper on the client that reads `tickets`, `donations`, `showings→movies.genre`, and posts a single `mailchimp-subscribe` call. Server-side would be cleaner but keeps parity with the current fire-and-forget pattern and avoids a background worker.
- **Interest IDs**: bootstrap function creates the category once and stores the returned group IDs in a new `app_config` row (`key='mailchimp_interests'`). Every subsequent sync reads that row instead of hitting Mailchimp's schema endpoint.
- **Webhook auth**: Mailchimp does not sign webhooks; the accepted pattern is a long random query-string secret. Bootstrap generates and stores it, prints the full webhook URL for you to paste into Mailchimp's audience settings.
- **E-commerce store**: single store per Mailchimp audience, id `kenworthy-web`. Products are showings (id = showing UUID, name = title, category = film / event / performance). Orders reference the buyer email.
- **Campaign draft**: uses Mailchimp's `campaigns` + `campaigns/{id}/content` endpoints. Subject line "This week at the Kenworthy: {title}"; body pulls poster URL, description, showtime, and links to `https://kenworthy-ticketing.lovable.app/showing/{id}`. Nothing is sent — the admin reviews and clicks send in Mailchimp.
- **Idempotency**: e-commerce order id = `ticket:{ticket_id}` / `donation:{donation_id}` / `dvd:{rental_id}` so retries don't duplicate.
- **Nothing is retroactive** on the first deploy — only new events sync. The "Sync all contacts now" admin button walks existing profiles + tickets + donations and backfills merge fields, tags, and e-commerce orders in batches.

## Out of scope (intentionally)

- Abandoned-cart events — we don't have a persistent cart yet.
- SMS / Mailchimp Journeys — not in your current plan tier.
- Removing tags when a contact churns — additive only; you can build segments on "last purchase > N months" instead.

Shall I go ahead and build it?
