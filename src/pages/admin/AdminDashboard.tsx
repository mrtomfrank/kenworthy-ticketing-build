import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Film, Plus, Calendar, Ticket, Edit, Trash2, ShoppingCart, ScanLine } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<any[]>([]);
  const [showings, setShowings] = useState<any[]>([]);
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin, authLoading, navigate]);

  async function loadData() {
    const [moviesRes, showingsRes, ticketsRes] = await Promise.all([
      supabase.from('movies').select('*').order('created_at', { ascending: false }),
      supabase.from('showings').select('*, movies(title)').order('start_time', { ascending: false }),
      supabase.from('tickets').select('id', { count: 'exact' }),
    ]);
    setMovies(moviesRes.data || []);
    setShowings(showingsRes.data || []);
    setTicketCount(ticketsRes.count || 0);
  }

  const deleteMovie = async (id: string) => {
    if (!confirm('Delete this movie and all its showings?')) return;
    const { error } = await supabase.from('movies').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Movie deleted'); loadData(); }
  };

  const deleteShowing = async (id: string) => {
    if (!confirm('Delete this showing?')) return;
    const { error } = await supabase.from('showings').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Showing deleted'); loadData(); }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="glass">
          <CardContent className="p-5 flex items-center gap-3">
            <Film className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{movies.length}</p>
              <p className="text-sm text-muted-foreground">Movies</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-5 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{showings.length}</p>
              <p className="text-sm text-muted-foreground">Showings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-5 flex items-center gap-3">
            <Ticket className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{ticketCount}</p>
              <p className="text-sm text-muted-foreground">Tickets Sold</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movies */}
      <div className="mb-8">
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
                  <Button variant="ghost" size="sm" onClick={() => deleteMovie(movie.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {movies.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No movies yet. Add one to get started!</p>
          )}
        </div>
      </div>

      {/* Showings */}
      <div>
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
                  <p className="font-medium">{(showing as any).movies?.title || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(showing.start_time), 'MMM d, yyyy h:mm a')} • ${Number(showing.ticket_price).toFixed(2)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteShowing(showing.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {showings.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No showings scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
}
