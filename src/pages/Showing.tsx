import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Film, Calendar, Clock, DollarSign, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Seat {
  id: string;
  seat_row: string;
  seat_number: number;
  seat_type: string;
}

export default function Showing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showing, setShowing] = useState<any>(null);
  const [movie, setMovie] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [takenSeatIds, setTakenSeatIds] = useState<Set<string>>(new Set());
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const TAX_RATE = 0.06;

  useEffect(() => {
    async function load() {
      if (!id) return;
      const { data: s } = await supabase.from('showings').select('*').eq('id', id).single();
      if (!s) { navigate('/'); return; }
      setShowing(s);

      const [movieRes, seatsRes, ticketsRes] = await Promise.all([
        supabase.from('movies').select('*').eq('id', s.movie_id).single(),
        supabase.from('seats').select('*').order('seat_row').order('seat_number'),
        supabase.from('tickets').select('seat_id').eq('showing_id', id),
      ]);

      setMovie(movieRes.data);
      setSeats(seatsRes.data || []);
      setTakenSeatIds(new Set((ticketsRes.data || []).map(t => t.seat_id)));
      setLoading(false);
    }
    load();
  }, [id, navigate]);

  const toggleSeat = (seatId: string) => {
    if (takenSeatIds.has(seatId)) return;
    setSelectedSeats(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  };

  const subtotal = selectedSeats.size * (showing?.ticket_price || 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const handlePurchase = async () => {
    if (!user) { navigate('/auth'); return; }
    if (selectedSeats.size === 0) { toast.error('Please select at least one seat'); return; }
    
    setPurchasing(true);
    try {
      const ticketRows = Array.from(selectedSeats).map(seatId => ({
        user_id: user.id,
        showing_id: id!,
        seat_id: seatId,
        price: Number(showing.ticket_price),
        tax_rate: TAX_RATE,
        tax_amount: Math.round(Number(showing.ticket_price) * TAX_RATE * 100) / 100,
        total_price: Math.round(Number(showing.ticket_price) * (1 + TAX_RATE) * 100) / 100,
        qr_code: crypto.randomUUID(),
        status: 'confirmed',
      }));

      const { error } = await supabase.from('tickets').insert(ticketRows);
      if (error) throw error;

      toast.success(`${selectedSeats.size} ticket(s) purchased successfully!`);
      navigate('/my-tickets');
    } catch (err: any) {
      toast.error(err.message || 'Failed to purchase tickets');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  }

  const seatRows = seats.reduce<Record<string, Seat[]>>((acc, seat) => {
    (acc[seat.seat_row] = acc[seat.seat_row] || []).push(seat);
    return acc;
  }, {});

  return (
    <div className="container py-8 px-4 max-w-5xl">
      {/* Movie info */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">← Back</Button>
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Film className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{movie?.title}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {format(new Date(showing.start_time), 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {format(new Date(showing.start_time), 'h:mm a')}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> ${Number(showing.ticket_price).toFixed(2)} per seat
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Seating Map */}
        <div className="lg:col-span-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-display text-lg">Select Your Seats</CardTitle>
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
              {/* Screen */}
              <div className="mb-8 text-center">
                <div className="mx-auto w-3/4 h-2 bg-primary/30 rounded-full mb-1" />
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Screen</p>
              </div>

              {/* Seats */}
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
            </CardContent>
          </Card>
        </div>

        {/* Checkout */}
        <div>
          <Card className="glass sticky top-20">
            <CardHeader>
              <CardTitle className="font-display text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSeats.size === 0 ? (
                <p className="text-muted-foreground text-sm">Select seats to continue</p>
              ) : (
                <>
                  <div className="space-y-2 text-sm">
                    {Array.from(selectedSeats).map(seatId => {
                      const seat = seats.find(s => s.id === seatId);
                      return seat ? (
                        <div key={seatId} className="flex justify-between">
                          <span>Row {seat.seat_row}, Seat {seat.seat_number}</span>
                          <span>${Number(showing.ticket_price).toFixed(2)}</span>
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
                      <span className="text-muted-foreground">Tax (6% ID)</span>
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
                    onClick={handlePurchase} 
                    disabled={purchasing}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {purchasing ? 'Processing...' : `Purchase ${selectedSeats.size} Ticket(s)`}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Simulated checkout — no real charge
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
