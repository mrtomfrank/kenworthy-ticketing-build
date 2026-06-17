## What gets built

A visual seat-group → price-tier editor that lives on each Movie, Event, and Live Performance form. Showings inherit that map, and any admin/staff can override the map on a single showing without touching the production template.

## Data model

Two new tables, both venue-aware:

- `production_price_tiers` — tier templates owned by a production.
  - `production_type` ('movie' | 'event' | 'concert'), `production_id`
  - `tier_name`, `price`, `color` (hex for the map swatch), `display_order`
- `production_seat_tiers` — which template tier each seat belongs to.
  - `production_type`, `production_id`, `venue_seat_id`, `tier_template_id`
  - unique on (production_type, production_id, venue_seat_id)

Per-showing override table:

- `showing_seat_tiers` — seat → tier mapping for a specific showing.
  - `showing_id`, `venue_seat_id`, `tier_id` (FK to existing `showing_price_tiers`)
  - unique on (showing_id, venue_seat_id)

`showing_price_tiers` already exists and stays as the live, billable source of truth (the `enforce_ticket_pricing` trigger keeps reading it). When a showing is created from a production, both `showing_price_tiers` and `showing_seat_tiers` are populated by copying the production template.

A `gain_color` column is added to `showing_price_tiers` so the seat map can show consistent tier colors on the customer side.

## UI

**Movie / Event / Performance forms**

A new "Seat pricing" section appears when the production has at least one venue with assigned seating. It shows:

1. A tier list (name, price, color swatch, +/- buttons) — same controls already used on the Showing form, with a color picker added.
2. The venue seat map (using the existing `SeatMap` layout, repurposed for editing). Admin picks a tier from the list, then clicks individual seats or click-and-drags to paint a region. Seats not assigned to any tier fall back to the lowest-priced tier on save.
3. A "Reset all" button and a per-tier count read-out (e.g. "Main Floor — 142 seats · $12").

The selected venue for the production template is the venue with assigned seating most commonly used (in practice, the main Kenworthy auditorium). If a production spans multiple venues, the editor switches via a venue picker.

**Showing form**

The existing tier list stays. A new collapsible "Customize seat map for this showing" panel below it loads the production's seat map as the starting state, then lets the admin paint over it for this showing only. Saving writes `showing_price_tiers` + `showing_seat_tiers` for that showing without touching the production template.

**Customer Showing page**

`SeatMap` is updated to render each seat in its tier color (with a legend showing tier name + price). When the customer selects seats from multiple tiers, the cart line items break out by tier. Tier color falls back to neutral if a seat has no mapping.

## Server-side integrity

- `enforce_ticket_pricing` is extended: when a `seat_id` is present and the showing has `showing_seat_tiers` rows, the trigger looks up the seat's tier and uses that tier's price — the client cannot send a cheaper tier than the seat allows.
- A helper `apply_production_template_to_showing(showing_id)` copies the production's tiers + seat map into a fresh showing row, called both from the Showing form and as a fallback in a trigger when a new showing has no tiers of its own.

## RLS

- `production_price_tiers`, `production_seat_tiers`, `showing_seat_tiers`: admins/staff can manage; public can SELECT (needed for the customer seat map to render tier colors and prices).

## Out of scope for this PR

- Lasso (drag-rectangle) selection — first cut uses click + shift-click ranges; drag-paint can be added later if the click-only flow feels slow.
- Tier-aware reporting in QBO export — current account mapping is by ticket type, not tier; revisit if needed.
