import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, Plus, Calendar, Ticket, Edit, Trash2, ShoppingCart, ScanLine, Music, PartyPopper, MapPin, BarChart3 } from 'lucide-react';
import AnalyticsTab from '@/components/admin/AnalyticsTab';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [concerts, setConcerts] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [showings, setShowings] = useState<any[]>([]);
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin, authLoading, navigate]);

  async function loadData() {
    const [moviesRes, eventsRes, concertsRes, venuesRes, showingsRes, ticketsRes] = await Promise.all([
      supabase.from('movies').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('concerts').select('*').order('created_at', { ascending: false }),
      supabase.from('venues').select('*').order('name'),
      supabase.from('showings').select('*, movies(title), events(title), concerts(title), venues(name)').order('start_time', { ascending: false }),
      supabase.from('tickets').select('id', { count: 'exact' }),
    ]);
    setMovies(moviesRes.data || []);
    setEvents(eventsRes.data || []);
    setConcerts(concertsRes.data || []);
    setVenues(venuesRes.data || []);
    setShowings(showingsRes.data || []);
    setTicketCount(ticketsRes.count || 0);
  }

  const deleteItem = async (table: 'movies' | 'events' | 'concerts' | 'venues' | 'showings', id: string, label: string) => {
    if (!confirm(`Delete this ${label}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`${label} deleted`); loadData(); }
  };

  const getShowingTitle = (s: any) => {
    return s.movies?.title || s.events?.title || s.concerts?.title || 'Unknown';
  };

  const getShowingCategory = (s: any) => {
    if (s.movie_id) return 'Movie';
    if (s.event_id) return 'Event';
    if (s.concert_id) return 'Concert';
    return '';
  };

  if (authLoading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="container py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/pos"><ShoppingCart className="h-4 w-4 mr-1" /> Staff POS</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/scanner"><ScanLine className="h-4 w-4 mr-1" /> Scanner</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <Film className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xl font-bold">{movies.length}</p>
              <p className="text-xs text-muted-foreground">Movies</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <PartyPopper className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xl font-bold">{events.length}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <Music className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xl font-bold">{concerts.length}</p>
              <p className="text-xs text-muted-foreground">Concerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-6 w-6 text-accent" />
            <div>
              <p className="text-xl font-bold">{showings.length}</p>
              <p className="text-xs text-muted-foreground">Showings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <Ticket className="h-6 w-6 text-success" />
            <div>
              <p className="text-xl font-bold">{ticketCount}</p>
              <p className="text-xs text-muted-foreground">Tickets Sold</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="movies" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="concerts">Concerts</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="showings">Showings</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1 inline" />Analytics</TabsTrigger>
        </TabsList>

        {/* Movies Tab */}
        <TabsContent value="movies">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Movies</h2>
            <Button size="sm" asChild>
              <Link to="/admin/movies/new"><Plus className="h-4 w-4 mr-1" /> Add Movie</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {movies.map(movie => (
              <Card key={movie.id} className="glass">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Film className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{movie.title}</p>
                      <div className="flex gap-2 mt-1">
                        {movie.rating && <Badge variant="secondary" className="text-xs">{movie.rating}</Badge>}
                        {movie.genre && <Badge variant="outline" className="text-xs">{movie.genre}</Badge>}
                        <Badge variant={movie.is_active ? 'default' : 'secondary'} className="text-xs">
                          {movie.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/movies/${movie.id}`}><Edit className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem('movies', movie.id, 'Movie')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {movies.length === 0 && <p className="text-muted-foreground text-center py-8">No movies yet.</p>}
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Events</h2>
            <Button size="sm" asChild>
              <Link to="/admin/events/new"><Plus className="h-4 w-4 mr-1" /> Add Event</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {events.map(event => (
              <Card key={event.id} className="glass">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PartyPopper className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">{event.ticket_type.replace('_', ' ')}</Badge>
                        <Badge variant={event.is_active ? 'default' : 'secondary'} className="text-xs">
                          {event.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/events/${event.id}`}><Edit className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem('events', event.id, 'Event')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {events.length === 0 && <p className="text-muted-foreground text-center py-8">No events yet.</p>}
          </div>
        </TabsContent>

        {/* Concerts Tab */}
        <TabsContent value="concerts">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Concerts</h2>
            <Button size="sm" asChild>
              <Link to="/admin/concerts/new"><Plus className="h-4 w-4 mr-1" /> Add Concert</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {concerts.map(concert => (
              <Card key={concert.id} className="glass">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{concert.title}</p>
                      <div className="flex gap-2 mt-1">
                        {concert.genre && <Badge variant="outline" className="text-xs">{concert.genre}</Badge>}
                        <Badge variant={concert.is_active ? 'default' : 'secondary'} className="text-xs">
                          {concert.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/concerts/${concert.id}`}><Edit className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem('concerts', concert.id, 'Concert')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {concerts.length === 0 && <p className="text-muted-foreground text-center py-8">No concerts yet.</p>}
          </div>
        </TabsContent>

        {/* Venues Tab */}
        <TabsContent value="venues">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Venues</h2>
            <Button size="sm" asChild>
              <Link to="/admin/venues/new"><Plus className="h-4 w-4 mr-1" /> Add Venue</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {venues.map(venue => (
              <Card key={venue.id} className="glass">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{venue.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{venue.total_seats} seats</Badge>
                        <Badge variant={venue.has_assigned_seating ? 'default' : 'secondary'} className="text-xs">
                          {venue.has_assigned_seating ? 'Assigned Seats' : 'General Admission'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/venues/${venue.id}`}><Edit className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem('venues', venue.id, 'Venue')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {venues.length === 0 && <p className="text-muted-foreground text-center py-8">No venues yet.</p>}
          </div>
        </TabsContent>

        {/* Showings Tab */}
        <TabsContent value="showings">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Showings</h2>
            <Button size="sm" asChild>
              <Link to="/admin/showings/new"><Plus className="h-4 w-4 mr-1" /> Add Showing</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {showings.map(showing => (
              <Card key={showing.id} className="glass">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getShowingTitle(showing)}</p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Badge variant="outline" className="text-xs">{getShowingCategory(showing)}</Badge>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(showing.start_time), 'MMM d, yyyy h:mm a')} • ${Number(showing.ticket_price).toFixed(2)}
                      </p>
                      {showing.venues?.name && (
                        <Badge variant="secondary" className="text-xs">{showing.venues.name}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/showings/${showing.id}`}><Edit className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem('showings', showing.id, 'Showing')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {showings.length === 0 && <p className="text-muted-foreground text-center py-8">No showings scheduled.</p>}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
