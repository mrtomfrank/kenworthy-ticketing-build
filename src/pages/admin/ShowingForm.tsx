import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Category = 'movie' | 'event' | 'concert';

export default function ShowingForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  const [category, setCategory] = useState<Category>('movie');
  const [movies, setMovies] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [concerts, setConcerts] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);

  const [itemId, setItemId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [ticketPrice, setTicketPrice] = useState('8.00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate('/'); return; }

    // Load all items (including inactive) so staff can schedule in advance
    Promise.all([
      supabase.from('movies').select('id, title, is_active').order('title'),
      supabase.from('events').select('id, title, ticket_type, is_active').order('title'),
      supabase.from('concerts').select('id, title, is_active').order('title'),
      supabase.from('venues').select('id, name, has_assigned_seating').order('name'),
    ]).then(([moviesRes, eventsRes, concertsRes, venuesRes]) => {
      setMovies(moviesRes.data || []);
      // Only show ticketed events (not rsvp or info_only)
      setEvents((eventsRes.data || []).filter((e: any) => e.ticket_type === 'ticketed'));
      setConcerts(concertsRes.data || []);
      setVenues(venuesRes.data || []);
    });

    if (isEdit) {
      supabase.from('showings').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          if (data.movie_id) { setCategory('movie'); setItemId(data.movie_id); }
          else if (data.event_id) { setCategory('event'); setItemId(data.event_id); }
          else if (data.concert_id) { setCategory('concert'); setItemId(data.concert_id); }
          setVenueId(data.venue_id || '');
          const dt = new Date(data.start_time);
          const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
          setStartTime(local);
          setTicketPrice(String(data.ticket_price));
        }
      });
    }
  }, [id, isEdit, isAdmin, authLoading, navigate]);

  const currentItems = category === 'movie' ? movies
    : category === 'event' ? events
    : concerts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) { toast.error('Please select an item'); return; }
    setSaving(true);

    const showingData: any = {
      movie_id: category === 'movie' ? itemId : null,
      event_id: category === 'event' ? itemId : null,
      concert_id: category === 'concert' ? itemId : null,
      venue_id: venueId || null,
      start_time: new Date(startTime).toISOString(),
      ticket_price: parseFloat(ticketPrice),
    };

    const { error } = isEdit
      ? await supabase.from('showings').update(showingData).eq('id', id)
      : await supabase.from('showings').insert(showingData);

    if (error) toast.error(error.message);
    else { toast.success(isEdit ? 'Showing updated!' : 'Showing created!'); navigate('/admin'); }
    setSaving(false);
  };

  if (authLoading) return null;

  return (
    <div className="container py-8 px-4 max-w-lg">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="mb-4">← Back</Button>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display">{isEdit ? 'Edit Showing' : 'Add Showing'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v as Category); setItemId(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="concert">Concert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{category === 'movie' ? 'Movie' : category === 'event' ? 'Event' : 'Concert'} *</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${category}`} />
                </SelectTrigger>
                <SelectContent>
                  {currentItems.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}{!item.is_active ? ' (inactive)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Select value={venueId} onValueChange={setVenueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a venue (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}{v.has_assigned_seating ? ' (Assigned Seats)' : ' (GA)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" required value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ticket Price ($)</Label>
              <Input type="number" step="0.01" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Showing' : 'Create Showing'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
