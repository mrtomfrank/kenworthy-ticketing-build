import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Film, Clock, Calendar, MapPin, Music, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ProductionDetailDrawer } from '@/components/ProductionDetailDrawer';

interface ShowingInfo {
  id: string;
  start_time: string;
  ticket_price: number;
}

interface MovieWithShowings {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  trailer_url: string | null;
  duration_minutes: number;
  rating: string | null;
  genre: string | null;
  showings: ShowingInfo[];
}

interface EventWithShowings {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  trailer_url: string | null;
  rating: string | null;
  genre: string | null;
  ticket_type: string;
  rsvp_url: string | null;
  showings: ShowingInfo[];
}

interface ConcertWithShowings {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  trailer_url: string | null;
  rating: string | null;
  genre: string | null;
  showings: ShowingInfo[];
}

export default function Index() {
  const [movies, setMovies] = useState<MovieWithShowings[]>([]);
  const [events, setEvents] = useState<EventWithShowings[]>([]);
  const [concerts, setConcerts] = useState<ConcertWithShowings[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<any>(null);

  useEffect(() => {
    async function fetchAll() {
      const now = new Date().toISOString();

      const [moviesRes, eventsRes, concertsRes, showingsRes] = await Promise.all([
        supabase.from('movies').select('*').eq('is_active', true).order('title'),
        supabase.from('events').select('*').eq('is_active', true).order('title'),
        supabase.from('concerts').select('*').eq('is_active', true).order('title'),
        supabase.from('showings').select('*').eq('is_active', true).gte('start_time', now).order('start_time'),
      ]);

      const showings = showingsRes.data || [];

      setMovies((moviesRes.data || []).map(m => ({
        ...m,
        showings: showings.filter(s => s.movie_id === m.id),
      })));

      setEvents((eventsRes.data || []).map(e => ({
        ...e,
        showings: showings.filter(s => s.event_id === e.id),
      })));

      setConcerts((concertsRes.data || []).map(c => ({
        ...c,
        showings: showings.filter(s => s.concert_id === c.id),
      })));

      setLoading(false);
    }
    fetchAll();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="container relative text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <MapPin className="h-3 w-3 mr-1" /> Moscow, Idaho
          </Badge>
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-4 tracking-tight">
            The <span className="text-gradient">Kenworthy</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Performing Arts Centre — Your destination for unforgettable cinema experiences in the heart of Moscow, Idaho.
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" asChild>
              <a href="#now-showing">Now Showing</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth?tab=signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Movies */}
      <section id="now-showing" className="container py-16 px-4">
        <h2 className="font-display text-3xl font-bold mb-8">Now Showing</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass animate-pulse h-80" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <Card className="glass p-12 text-center">
            <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No movies currently showing. Check back soon!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((movie, i) => (
              <Card
                key={movie.id}
                className="glass overflow-hidden hover:glow-primary transition-shadow duration-300 opacity-0 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
                onClick={() => { setSelectedProduction({ ...movie, type: 'movie' }); setDrawerOpen(true); }}
              >
                <div className="aspect-[2/3] bg-secondary flex items-center justify-center relative overflow-hidden">
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="h-16 w-16 text-muted-foreground" />
                  )}
                  <div className="absolute top-3 right-3 flex gap-1">
                    {movie.rating && <Badge>{movie.rating}</Badge>}
                    {movie.genre && <Badge variant="secondary">{movie.genre}</Badge>}
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-display text-xl font-bold mb-2">{movie.title}</h3>
                  {movie.description && (
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{movie.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {movie.duration_minutes} min
                    </span>
                  </div>
                  {movie.showings.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Upcoming Showings</p>
                      <div className="flex flex-wrap gap-2">
                        {movie.showings.slice(0, 4).map(showing => (
                          <Button key={showing.id} variant="outline" size="sm" asChild>
                            <Link to={`/showing/${showing.id}`}>
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(showing.start_time), 'MMM d, h:mm a')}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming showings</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Events */}
      {events.length > 0 && (
        <section className="container py-16 px-4">
          <h2 className="font-display text-3xl font-bold mb-8 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> Events
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, i) => (
              <Card
                key={event.id}
                className="glass overflow-hidden hover:glow-primary transition-shadow duration-300 opacity-0 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
                onClick={() => { setSelectedProduction({ ...event, type: 'event' }); setDrawerOpen(true); }}
              >
                <div className="aspect-[2/3] bg-secondary flex items-center justify-center relative overflow-hidden">
                  {event.poster_url ? (
                    <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="h-16 w-16 text-muted-foreground" />
                  )}
                  <div className="absolute top-3 right-3 flex gap-1">
                    {event.rating && <Badge>{event.rating}</Badge>}
                    {event.genre && <Badge variant="secondary">{event.genre}</Badge>}
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                      {event.ticket_type === 'rsvp' ? 'RSVP' : event.ticket_type === 'info_only' ? 'Info' : 'Ticketed'}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-display text-xl font-bold mb-2">{event.title}</h3>
                  {event.description && (
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{event.description}</p>
                  )}
                  {event.ticket_type === 'rsvp' && event.rsvp_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={event.rsvp_url} target="_blank" rel="noopener noreferrer">RSVP Now</a>
                    </Button>
                  ) : event.showings.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Upcoming Showings</p>
                      <div className="flex flex-wrap gap-2">
                        {event.showings.slice(0, 4).map(showing => (
                          <Button key={showing.id} variant="outline" size="sm" asChild>
                            <Link to={`/showing/${showing.id}`}>
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(showing.start_time), 'MMM d, h:mm a')}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : event.ticket_type !== 'info_only' ? (
                    <p className="text-sm text-muted-foreground">No upcoming showings</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Live Performances */}
      {concerts.length > 0 && (
        <section className="container py-16 px-4">
          <h2 className="font-display text-3xl font-bold mb-8 flex items-center gap-2">
            <Music className="h-7 w-7 text-primary" /> Live Performances
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concerts.map((concert, i) => (
              <Card
                key={concert.id}
                className="glass overflow-hidden hover:glow-primary transition-shadow duration-300 opacity-0 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
                onClick={() => { setSelectedProduction({ ...concert, type: 'concert' }); setDrawerOpen(true); }}
              >
                <div className="aspect-[2/3] bg-secondary flex items-center justify-center relative overflow-hidden">
                  {concert.poster_url ? (
                    <img src={concert.poster_url} alt={concert.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="h-16 w-16 text-muted-foreground" />
                  )}
                  <div className="absolute top-3 right-3 flex gap-1">
                    {concert.rating && <Badge>{concert.rating}</Badge>}
                    {concert.genre && <Badge variant="secondary">{concert.genre}</Badge>}
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-display text-xl font-bold mb-2">{concert.title}</h3>
                  {concert.description && (
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{concert.description}</p>
                  )}
                  {concert.showings.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Upcoming Showings</p>
                      <div className="flex flex-wrap gap-2">
                        {concert.showings.slice(0, 4).map(showing => (
                          <Button key={showing.id} variant="outline" size="sm" asChild>
                            <Link to={`/showing/${showing.id}`}>
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(showing.start_time), 'MMM d, h:mm a')}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming showings</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Info */}
      <section className="container py-16 px-4">
        <Card className="glass p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="font-display text-2xl font-bold mb-4">Visit Us</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  508 S Main St, Moscow, ID 83843
                </p>
                <p>The Kenworthy Performing Arts Centre is a beloved community landmark in downtown Moscow, Idaho.</p>
              </div>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold mb-4">Ticket Info</h2>
              <div className="space-y-2 text-muted-foreground">
                <p>• Purchase tickets online or at the box office</p>
                <p>• Present your QR code at the door</p>
                <p>• Idaho sales tax of 6% applies</p>
                <p>• All sales are final</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <ProductionDetailDrawer
        production={selectedProduction}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} The Kenworthy Performing Arts Centre • Moscow, Idaho</p>
        </div>
      </footer>
    </div>
  );
}
