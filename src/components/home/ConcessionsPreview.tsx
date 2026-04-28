import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConcessionItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

/**
 * A printed-program-style preview of what's at the concessions stand.
 * Pulls live from `concession_items` so admins can edit prices, names,
 * and categories from the back-end Concessions tab and see changes here.
 *
 * Sits between the editorial calendar and the Backstage teaser — a
 * small, warm reminder that there's popcorn waiting.
 */
export function ConcessionsPreview() {
  const [items, setItems] = useState<ConcessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('concession_items')
        .select('id, name, price, category')
        .eq('is_active', true)
        .order('category')
        .order('price');
      if (cancelled) return;
      setItems((data as ConcessionItem[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || items.length === 0) return null;

  // Group by category, preserving the order categories first appear.
  const grouped = items.reduce<Record<string, ConcessionItem[]>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  // Combos are special — surface them at the bottom in a contrasting block.
  const combos = grouped['Combos'] || [];
  const regularCategories = categories.filter((c) => c !== 'Combos');

  return (
    <section
      aria-label="Concessions menu"
      className="relative border-t border-accent/20 bg-[hsl(var(--background))]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse at 30% 0%, hsl(var(--primary) / 0.10), transparent 60%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="text-center mb-10">
          <p className="font-serif text-xs uppercase tracking-[0.3em] text-accent mb-3">
            At the stand
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-3">
            Concessions
          </h2>
          <p className="font-serif italic text-muted-foreground max-w-md mx-auto">
            Popcorn popped fresh, candy by the handful, a cold drink to carry in.
          </p>
        </div>

        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {regularCategories.map((cat) => (
            <div key={cat}>
              <h3 className="font-display text-xl tracking-wide text-primary border-b border-accent/30 pb-2 mb-4">
                {cat}
              </h3>
              <ul className="space-y-2.5">
                {grouped[cat].map((it) => (
                  <li
                    key={it.id}
                    className="flex items-baseline gap-3 font-serif text-foreground"
                  >
                    <span className="flex-1">{it.name}</span>
                    <span
                      aria-hidden
                      className="flex-1 border-b border-dotted border-muted-foreground/40 translate-y-[-4px]"
                    />
                    <span className="tabular-nums text-accent font-medium">
                      ${Number(it.price).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {combos.length > 0 && (
          <div className="mt-12 rounded-lg border border-accent/30 bg-card/40 p-6 md:p-8">
            <h3 className="font-display text-xl tracking-wide text-accent mb-4">
              Combos
            </h3>
            <ul className="space-y-2.5">
              {combos.map((it) => (
                <li
                  key={it.id}
                  className="flex items-baseline gap-3 font-serif text-foreground"
                >
                  <span className="flex-1">{it.name}</span>
                  <span
                    aria-hidden
                    className="flex-[0.4] border-b border-dotted border-muted-foreground/40 translate-y-[-4px]"
                  />
                  <span className="tabular-nums text-accent font-medium">
                    ${Number(it.price).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-10 text-center font-serif italic text-xs text-muted-foreground/70">
          Prices subject to change. Idaho sales tax added at the register.
        </p>
      </div>
    </section>
  );
}