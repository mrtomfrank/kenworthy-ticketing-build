
INSERT INTO public.concession_items (name, price, category) VALUES
  ('Popcorn (Small)',         2.00, 'Popcorn'),
  ('Popcorn (Medium)',        4.00, 'Popcorn'),
  ('Popcorn (Large)',         5.00, 'Popcorn'),
  ('Soda (Small)',            3.00, 'Drinks'),
  ('Soda (Medium)',           4.00, 'Drinks'),
  ('Soda (Large)',            5.00, 'Drinks'),
  ('Candy',                   2.00, 'Candy'),
  ('Craft Beer (12 oz Can)',  6.00, 'Beer & Wine'),
  ('Draft Beer (16 oz)',      7.00, 'Beer & Wine'),
  ('Wine',                    7.00, 'Beer & Wine'),
  ('Bottled Beverage',        3.00, 'Drinks'),
  ('Soft Drink Can',          2.00, 'Drinks'),
  ('Classic Combo (Small) — Candy, Soda S, Popcorn S',  5.00, 'Combos'),
  ('Classic Combo (Medium) — Candy, Soda M, Popcorn M', 7.00, 'Combos'),
  ('Classic Combo (Large) — Candy, Soda L, Popcorn L',  9.00, 'Combos'),
  ('Date Night Combo — 2 Soda M, 1 Popcorn L',         10.00, 'Combos'),
  ('Family Combo — 2 Soda M, 2 Popcorn M',             12.00, 'Combos')
ON CONFLICT DO NOTHING;
