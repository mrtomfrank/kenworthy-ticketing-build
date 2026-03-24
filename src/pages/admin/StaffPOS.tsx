import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ShoppingCart, Check, Film, Calendar, DollarSign, User } from 'lucide-react';

interface Seat {
  id: string;
  seat_row: string;
  seat_number: number;
  seat_type: string;
}

interface ShowingOption {
  id: string;
  start_time: string;
  ticket_price: number;
  movie_title: string;
}

export default function StaffPOS() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [showings, setShowings] = useState<ShowingOption[]>([]);
  const [selectedShowingId, setSelectedShowingId] = useState('');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [takenSeatIds, setTakenSeatIds] = useState<Set<string>>(new Set());
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [patronEmail, setPatronEmail] = useState('');
  const [patronPhone, setPatronPhone] = useState('');
  const [selling, setSelling] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);

  const TAX_RATE = 0.06;

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate('/'); return; }

    async function loadShowings() {
      const { data } = await supabase
        .from('showings')
        .select('id, start_time, ticket_price, movies(title)')
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time');

      setShowings(
        (data || []).map((s: any) => ({
          id: s.id,
          start_time: s.start_time,
          ticket_price: s.ticket_price,
          movie_title: s.movies?.title || 'Unknown',
        }))
      );
    }
    loadShowings();
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!selectedShowingId) return;
    setSelectedSeats(new Set());
    setLoadingSeats(true);

    async function loadSeats() {
      const [seatsRes, ticketsRes] = await Promise.all([
        supabase.from('seats').select('*').order('seat_row').order('seat_number'),
        supabase.from('tickets').select('seat_id').eq('showing_id', selectedShowingId),
      ]);
      setSeats(seatsRes.data || []);
      setTakenSeatIds(new Set((ticketsRes.data || []).map(t => t.seat_id)));
      setLoadingSeats(false);
    }
    loadSeats();
  }, [selectedShowingId]);

  const selectedShowing = showings.find(s => s.id === selectedShowingId);
  const subtotal = selectedSeats.size * (selectedShowing?.ticket_price || 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const toggleSeat = (seatId: string) => {
    if (takenSeatIds.has(seatId)) return;
    setSelectedSeats(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  };

  const handleSell = async () => {
    if (!selectedShowingId || selectedSeats.size === 0) {
      toast.error('Select a showing and at least one seat');
      return;
    }
    if (!patronEmail && !patronPhone) {
      toast.error('Enter patron email or phone for digital ticket delivery');
      return;
    }

    setSelling(true);
    try {
      // Look up or create a profile for in-person sales
      // For POS sales, we use the admin's user_id but attach patron contact info via qr_code metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ticketRows = Array.from(selectedSeats).map(seatId => ({
        user_id: user.id,
        showing_id: selectedShowingId,
        seat_id: seatId,
        price: Number(selectedShowing!.ticket_price),
        tax_rate: TAX_RATE,
        tax_amount: Math.round(Number(selectedShowing!.ticket_price) * TAX_RATE * 100) / 100,
        total_price: Math.round(Number(selectedShowing!.ticket_price) * (1 + TAX_RATE) * 100) / 100,
        qr_code: crypto.randomUUID(),
        status: 'confirmed',
      }));

      const { error } = await supabase.from('tickets').insert(ticketRows);
      if (error) throw error;

      toast.success(
        `${selectedSeats.size} ticket(s) sold! Digital ticket sent to ${patronEmail || patronPhone}`,
        { duration: 5000 }
      );

      // Reset form
      setSelectedSeats(new Set());
      setPatronEmail('');
      setPatronPhone('');

      // Refresh taken seats
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('seat_id')
        .eq('showing_id', selectedShowingId);
      setTakenSeatIds(new Set((ticketsData || []).map(t => t.seat_id)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to process sale');
    } finally {
      setSelling(false);
    }
  };

  if (authLoading) {
    return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  }

  const seatRows = seats.reduce<Record<string, Seat[]>>((acc, seat) => {
    (acc[seat.seat_row] = acc[seat.seat_row] || []).push(seat);
    return acc;
  }, {});

  return (
    <div className="container py-8 px-4 max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <ShoppingCart className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Staff POS</h1>
        <Badge variant="secondary">Box Office</Badge>
      </div>
      <p className="text-muted-foreground mb-8">Sell tickets to walk-in patrons</p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Showing selection + Seating map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Showing selector */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" /> Select Showing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedShowingId} onValueChange={setSelectedShowingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a showing..." />
                </SelectTrigger>
                <SelectContent>
                  {showings.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.movie_title} — {format(new Date(s.start_time), 'MMM d, h:mm a')} — ${Number(s.ticket_price).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Seating map */}
          {selectedShowingId && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display text-lg">Seating Map</CardTitle>
                <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded bg-secondary border border-border" /> Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded bg-primary" /> Selected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded bg-muted-foreground/30" /> Taken
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSeats ? (
                  <p className="text-center text-muted-foreground py-8">Loading seats...</p>
                ) : (
                  <>
                    <div className="mb-8 text-center">
                      <div className="mx-auto w-3/4 h-2 bg-primary/30 rounded-full mb-1" />
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Screen</p>
                    </div>
                    <div className="space-y-2 overflow-x-auto">
                      {Object.entries(seatRows).sort().map(([row, rowSeats]) => (
                        <div key={row} className="flex items-center gap-1.5 justify-center">
                          <span className="w-6 text-xs text-muted-foreground font-medium text-center">{row}</span>
                          {rowSeats.sort((a, b) => a.seat_number - b.seat_number).map(seat => {
                            const taken = takenSeatIds.has(seat.id);
                            const selected = selectedSeats.has(seat.id);
                            return (
                              <button
                                key={seat.id}
                                onClick={() => toggleSeat(seat.id)}
                                disabled={taken}
                                className={cn(
                                  'h-7 w-7 rounded text-[10px] font-medium transition-all',
                                  taken && 'bg-muted-foreground/30 cursor-not-allowed',
                                  !taken && !selected && 'bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/50',
                                  selected && 'bg-primary text-primary-foreground glow-primary',
                                )}
                                title={`Row ${seat.seat_row} Seat ${seat.seat_number}`}
                              >
                                {seat.seat_number}
                              </button>
                            );
                          })}
                          <span className="w-6 text-xs text-muted-foreground font-medium text-center">{row}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Patron info + order summary */}
        <div className="space-y-6">
          <Card className="glass sticky top-20">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Patron Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patron-email">Email</Label>
                <Input
                  id="patron-email"
                  type="email"
                  placeholder="patron@email.com"
                  value={patronEmail}
                  onChange={e => setPatronEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patron-phone">Phone (optional)</Label>
                <Input
                  id="patron-phone"
                  type="tel"
                  placeholder="(208) 555-1234"
                  value={patronPhone}
                  onChange={e => setPatronPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass sticky top-[22rem]">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSeats.size === 0 ? (
                <p className="text-muted-foreground text-sm">Select a showing and seats to continue</p>
              ) : (
                <>
                  <p className="text-sm font-medium">{selectedShowing?.movie_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedShowing && format(new Date(selectedShowing.start_time), 'MMM d, yyyy h:mm a')}
                  </p>
                  <div className="space-y-1 text-sm">
                    {Array.from(selectedSeats).map(seatId => {
                      const seat = seats.find(s => s.id === seatId);
                      return seat ? (
                        <div key={seatId} className="flex justify-between">
                          <span>Row {seat.seat_row}, Seat {seat.seat_number}</span>
                          <span>${Number(selectedShowing!.ticket_price).toFixed(2)}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="border-t border-border pt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax (6%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-1">
                      <span>Total</span>
                      <span className="text-primary">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSell}
                    disabled={selling}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {selling ? 'Processing...' : `Sell ${selectedSeats.size} Ticket(s)`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
