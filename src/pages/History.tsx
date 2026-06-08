import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Film, Building2, Sparkles } from 'lucide-react';

type Milestone = {
  id: string; year: number; event_date: string | null;
  category: string; title: string; description: string | null;
  image_url: string | null; source_url: string | null;
};
type ArchiveRow = {
  id: string; year: number; venue_name: string;
  film_title_display: string; film_year: number | null;
  matched_movie_id: string | null;
  screening_date: string;
};

export default function HistoryPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [archive, setArchive] = useState<ArchiveRow[]>([]);
  const [activeDecade, setActiveDecade] = useState<number | null>(null);
  const [venueFilter, setVenueFilter] = useState<'kenworthy' | 'all'>('kenworthy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [m, a] = await Promise.all([
        supabase.from('kenworthy_history').select('*').order('year').order('event_date', { nullsFirst: true }),
        supabase.from('historical_screenings')
          .select('id, year, venue_name, film_title_display, film_year, matched_movie_id, screening_date')
          .order('screening_date', { ascending: true })
          .limit(50000),
      ]);
      setMilestones(m.data ?? []);
      setArchive(a.data ?? []);
      setLoading(false);
    })();
  }, []);

  const decades = useMemo(() => {
    const years = new Set<number>();
    archive.forEach(r => years.add(Math.floor(r.year / 10) * 10));
    milestones.forEach(r => years.add(Math.floor(r.year / 10) * 10));
    return Array.from(years).sort((a, b) => a - b);
  }, [archive, milestones]);

  const filteredArchive = useMemo(() =>
    archive.filter(r => venueFilter === 'all' || r.venue_name === 'Kenworthy'),
    [archive, venueFilter],
  );

  // Group by year for the feed
  const yearsToShow = useMemo(() => {
    const ys = new Set<number>();
    filteredArchive.forEach(r => ys.add(r.year));
    milestones.forEach(m => ys.add(m.year));
    let arr = Array.from(ys).sort((a, b) => a - b);
    if (activeDecade != null) arr = arr.filter(y => y >= activeDecade && y < activeDecade + 10);
    return arr;
  }, [filteredArchive, milestones, activeDecade]);

  const screeningsByYear = useMemo(() => {
    const map = new Map<number, ArchiveRow[]>();
    for (const r of filteredArchive) {
      if (!map.has(r.year)) map.set(r.year, []);
      map.get(r.year)!.push(r);
    }
    return map;
  }, [filteredArchive]);

  const milestonesByYear = useMemo(() => {
    const map = new Map<number, Milestone[]>();
    for (const m of milestones) {
      if (!map.has(m.year)) map.set(m.year, []);
      map.get(m.year)!.push(m);
    }
    return map;
  }, [milestones]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="border-b border-border/40 bg-secondary/20">
        <div className="container max-w-5xl py-12 px-4">
          <p className="text-xs uppercase tracking-[0.3em] text-accent font-display">Est. 1926</p>
          <h1 className="font-display text-4xl md:text-6xl mt-2">A Century on Main Street</h1>
          <p className="font-serif text-lg text-muted-foreground mt-4 max-w-2xl">
            Every film, renovation, and turning point we have on record from the Kenworthy and her sister
            theaters in Moscow and the Palouse — assembled from a hundred years of newspaper listings,
            building permits, and community memory.
          </p>
          <div className="flex gap-2 mt-6 flex-wrap">
            <Button
              variant={venueFilter === 'kenworthy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVenueFilter('kenworthy')}
            >Kenworthy only</Button>
            <Button
              variant={venueFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVenueFilter('all')}
            >All Palouse theaters</Button>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl px-4 py-8 flex gap-8">
        {/* Decade scrubber */}
        <aside className="hidden md:block sticky top-20 self-start w-32 shrink-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-display mb-2">Decade</p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setActiveDecade(null)}
              className={`text-left text-sm font-display py-1 px-2 rounded ${activeDecade == null ? 'bg-primary/15 text-primary' : 'hover:bg-secondary/60'}`}
            >All</button>
            {decades.map(d => (
              <button key={d} onClick={() => setActiveDecade(d)}
                className={`text-left text-sm font-display py-1 px-2 rounded ${activeDecade === d ? 'bg-primary/15 text-primary' : 'hover:bg-secondary/60'}`}>
                {d}s
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-10">
          {loading && <p className="text-muted-foreground">Loading the archive…</p>}
          {!loading && yearsToShow.length === 0 && (
            <p className="text-muted-foreground">Nothing on file for this decade yet.</p>
          )}
          {yearsToShow.map(year => {
            const ms = milestonesByYear.get(year) ?? [];
            const scs = screeningsByYear.get(year) ?? [];
            return (
              <section key={year} className="border-l-2 border-accent/40 pl-6 relative">
                <div className="absolute -left-2 top-0 w-3 h-3 rounded-full bg-accent" />
                <h2 className="font-display text-3xl">{year}</h2>

                {ms.map(m => (
                  <Card key={m.id} className="mt-3 glass border-accent/40">
                    <CardContent className="p-4 flex gap-4">
                      {m.image_url && (
                        <img src={m.image_url} alt="" className="w-32 h-32 object-cover rounded shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-accent">
                          {m.category === 'renovation' ? <Building2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                          <span className="text-xs uppercase tracking-wide font-display">{m.category}</span>
                        </div>
                        <p className="font-display text-xl mt-1">{m.title}</p>
                        {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                        {m.source_url && (
                          <a href={m.source_url} target="_blank" rel="noreferrer"
                            className="text-xs text-primary hover:underline mt-2 inline-block">Source →</a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {scs.length > 0 && (
                  <Card className="mt-3 glass">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Film className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-wide font-display">
                          {scs.length} screening{scs.length === 1 ? '' : 's'} on record
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {scs.slice(0, 60).map(r => {
                          const inner = (
                            <span className="flex items-center gap-1">
                              {r.film_title_display}
                              {r.film_year && <span className="text-muted-foreground/70">({r.film_year})</span>}
                              {venueFilter === 'all' && r.venue_name !== 'Kenworthy' && (
                                <Badge variant="outline" className="text-[10px] ml-1">{r.venue_name}</Badge>
                              )}
                            </span>
                          );
                          return r.matched_movie_id ? (
                            <Link key={r.id} to={`/`} className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded">
                              {inner}
                            </Link>
                          ) : (
                            <span key={r.id} className="text-xs bg-secondary/60 px-2 py-1 rounded">{inner}</span>
                          );
                        })}
                        {scs.length > 60 && (
                          <span className="text-xs text-muted-foreground self-center">…and {scs.length - 60} more</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
}