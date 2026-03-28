import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Film, Calendar, Clock, DollarSign, Check, Minus, Plus } from 'lucide-react';
import { SeatMap } from '@/components/SeatMap';
import { type Seat, TAX_RATE, buildTicketRows, computeOrderTotals } from '@/lib/booking';

export default function Showing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showing, setShowing] = useState<any>(null);
  const [movie, setMovie] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [takenSeatIds, setTakenSeatIds] = useState<Set<string>>(new Set());
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [gaQuantity, setGaQuantity] = useState(0);
  const [ticketsSold, setTicketsSold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const isAssignedSeating = showing?.requires_seat_selection;
  const totalSeats = showing?.total_seats || 200;
  const gaAvailable = totalSeats - ticketsSold;

  useEffect(() => {
    async function load() {
      if (!id) return;
      const { data: s } = await supabase.from('showings').select('*').eq('id', id).single();
      if (!s) { navigate('/'); return; }
      setShowing(s);

      const moviePromise = supabase.from('movies').select('*').eq('id', s.movie_id).single();

      if (s.requires_seat_selection) {
        const [movieRes, seatsRes, ticketsRes] = await Promise.all([
          moviePromise,
          supabase.from('seats').select('*').order('seat_row').order('seat_number'),
          supabase.from('tickets').select('seat_id').eq('showing_id', id).eq('status', 'confirmed'),
        ]);
        setMovie(movieRes.data);
        setSeats(seatsRes.data || []);
        setTakenSeatIds(new Set((ticketsRes.data || []).map(t => t.seat_id)));
      } else {
        const [movieRes, ticketsRes] = await Promise.all([
          moviePromise,
          supabase.from('tickets').select('id', { count: 'exact' }).eq('showing_id', id).eq('status', 'confirmed'),
        ]);
        setMovie(movieRes.data);
        setTicketsSold(ticketsRes.count || 0);
      }
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

  const ticketCount = isAssignedSeating ? selectedSeats.size : gaQuantity;
  const { subtotal, tax, total } = computeOrderTotals(ticketCount, showing?.ticket_price || 0);

  const handlePurchase = async () => {
    if (!user) { navigate('/auth'); return; }
    if (ticketCount === 0) { toast.error('Please select at least one ticket'); return; }

    setPurchasing(true);
    try {
      const ticketRows = buildTicketRows({
        selectedSeats: isAssignedSeating ? selectedSeats : new Set<string>(),
        quantity: isAssignedSeating ? undefined : gaQuantity,
        userId: user.id,
        showingId: id!,
        ticketPrice: showing.ticket_price,
        paymentMethod: 'online',
      });

      const { error } = await supabase.from('tickets').insert(ticketRows);
      if (error) throw error;

      toast.success(`${ticketCount} ticket(s) purchased successfully!`);
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
                <DollarSign className="h-4 w-4" /> ${Number(showing.ticket_price).toFixed(2)} per ticket
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Seating Map or GA Quantity */}
        <div className="lg:col-span-2">
          {isAssignedSeating ? (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display text-lg">Select Your Seats</CardTitle>
              </CardHeader>
              <CardContent>
                <SeatMap
                  seats={seats}
                  takenSeatIds={takenSeatIds}
                  selectedSeats={selectedSeats}
                  onToggleSeat={toggleSeat}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display text-lg">General Admission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This is a general admission event — seating is first-come, first-served.
                </p>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Tickets</p>
                    <p className="text-xs text-muted-foreground">{gaAvailable} available</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setGaQuantity(q => Math.max(0, q - 1))}
                      disabled={gaQuantity === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-bold w-8 text-center">{gaQuantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setGaQuantity(q => Math.min(gaAvailable, q + 1))}
                      disabled={gaQuantity >= gaAvailable}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Checkout */}
        <div>
          <Card className="glass sticky top-20">
            <CardHeader>
              <CardTitle className="font-display text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticketCount === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {isAssignedSeating ? 'Select seats to continue' : 'Add tickets to continue'}
                </p>
              ) : (
                <>
                  <div className="space-y-2 text-sm">
                    {isAssignedSeating ? (
                      Array.from(selectedSeats).map(seatId => {
                        const seat = seats.find(s => s.id === seatId);
                        return seat ? (
                          <div key={seatId} className="flex justify-between">
                            <span>Row {seat.seat_row}, Seat {seat.seat_number}</span>
                            <span>${Number(showing.ticket_price).toFixed(2)}</span>
                          </div>
                        ) : null;
                      })
                    ) : (
                      <div className="flex justify-between">
                        <span>General Admission × {gaQuantity}</span>
                        <span>${(gaQuantity * Number(showing.ticket_price)).toFixed(2)}</span>
                      </div>
                    )}
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
                    {purchasing ? 'Processing...' : `Purchase ${ticketCount} Ticket(s)`}
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
