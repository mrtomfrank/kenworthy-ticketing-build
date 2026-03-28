import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function ShowingForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<any[]>([]);
  const [movieId, setMovieId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [ticketPrice, setTicketPrice] = useState('8.00');
  const [requiresSeatSelection, setRequiresSeatSelection] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate('/'); return; }

    supabase.from('movies').select('id, title').eq('is_active', true).order('title').then(({ data }) => {
      setMovies(data || []);
    });

    if (isEdit) {
      supabase.from('showings').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setMovieId(data.movie_id);
          // Format datetime-local value
          const dt = new Date(data.start_time);
          const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
          setStartTime(local);
          setTicketPrice(String(data.ticket_price));
          setRequiresSeatSelection((data as any).requires_seat_selection ?? false);
        }
      });
    }
  }, [id, isEdit, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieId) { toast.error('Please select a movie'); return; }
    setSaving(true);

    const showingData = {
      movie_id: movieId,
      start_time: new Date(startTime).toISOString(),
      ticket_price: parseFloat(ticketPrice),
      requires_seat_selection: requiresSeatSelection,
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
              <Label>Movie *</Label>
              <Select value={movieId} onValueChange={setMovieId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a movie" />
                </SelectTrigger>
                <SelectContent>
                  {movies.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
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
            <div className="flex items-center gap-3 py-2">
              <Checkbox
                id="seat-selection"
                checked={requiresSeatSelection}
                onCheckedChange={(checked) => setRequiresSeatSelection(checked === true)}
              />
              <div>
                <Label htmlFor="seat-selection" className="cursor-pointer">Assigned seating</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, patrons choose specific seats. Otherwise, tickets are general admission.
                </p>
              </div>
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
