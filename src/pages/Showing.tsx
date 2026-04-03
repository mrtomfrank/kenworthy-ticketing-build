import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Film, Calendar, Clock, DollarSign, Check, Minus, Plus, MapPin, Sparkles, Music, CreditCard } from 'lucide-react';
import { SeatMap } from '@/components/SeatMap';
import { type Seat, type PriceTier, TAX_RATE, buildTicketRows, computeOrderTotals, computeLineItemTotals, type TicketLineItem } from '@/lib/booking';

type ProductionType = 'movie' | 'event' | 'concert';

function getProductionMeta(type: ProductionType) {
  switch (type) {
    case 'movie': return { icon: Film, label: 'Movie' };
    case 'event': return { icon: Sparkles, label: 'Event' };
    case 'concert': return { icon: Music, label: 'Concert' };
  }
}

export default function Showing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showing, setShowing] = useState<any>(null);
  const [production, setProduction] = useState<any>(null);
  const [productionType, setProductionType] = useState<ProductionType>('movie');
  const [venue, setVenue] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [takenSeatIds, setTakenSeatIds] = useState<Set<string>>(new Set());
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [gaQuantity, setGaQuantity] = useState(0);
  const [ticketsSold, setTicketsSold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [tierQuantities, setTierQuantities] = useState<Record<string, number>>({});
  const [selectedTierId, setSelectedTierId] = useState<string>(''); // for assigned seating: one tier at a time

  const hasTiers = priceTiers.length > 0;
  const isAssignedSeating = showing?.requires_seat_selection;
  const totalSeats = showing?.total_seats || 200;
  const gaAvailable = totalSeats - ticketsSold;

  useEffect(() => {
    async function load() {
      if (!id) return;
      const [showingRes, tiersRes] = await Promise.all([
        supabase.from('showings').select('*').eq('id', id).single(),
        supabase.from('showing_price_tiers').select('*').eq('showing_id', id).eq('is_active', true).order('display_order'),
      ]);

      const s = showingRes.data;
      if (!s) { navigate('/'); return; }
      setShowing(s);

      const tiers: PriceTier[] = (tiersRes.data || []).map((t: any) => ({
        id: t.id,
        tier_name: t.tier_name,
        price: Number(t.price),
        display_order: t.display_order,
      }));
      setPriceTiers(tiers);
      if (tiers.length > 0) {
        setSelectedTierId(tiers[0].id);
        const initial: Record<string, number> = {};
        tiers.forEach(t => initial[t.id] = 0);
        setTierQuantities(initial);
      }

      let type: ProductionType = 'movie';
      let productionPromise;
      if (s.event_id) {
        type = 'event';
        productionPromise = supabase.from('events').select('*').eq('id', s.event_id).single();
      } else if (s.concert_id) {
        type = 'concert';
        productionPromise = supabase.from('concerts').select('*').eq('id', s.concert_id).single();
      } else {
        productionPromise = supabase.from('movies').select('*').eq('id', s.movie_id).single();
      }
      setProductionType(type);

      const venuePromise = s.venue_id
        ? supabase.from('venues').select('*').eq('id', s.venue_id).single()
        : Promise.resolve({ data: null });

      if (s.requires_seat_selection) {
        const [prodRes, venueRes, seatsRes, ticketsRes] = await Promise.all([
          productionPromise,
          venuePromise,
          supabase.from('seats').select('*').order('seat_row').order('seat_number'),
          supabase.from('tickets').select('seat_id').eq('showing_id', id).eq('status', 'confirmed'),
        ]);
        setProduction(prodRes.data);
        setVenue(venueRes.data);
        setSeats(seatsRes.data || []);
        setTakenSeatIds(new Set((ticketsRes.data || []).map(t => t.seat_id)));
      } else {
        const [prodRes, venueRes, ticketsRes] = await Promise.all([
          productionPromise,
          venuePromise,
          supabase.from('tickets').select('id', { count: 'exact' }).eq('showing_id', id).eq('status', 'confirmed'),
        ]);
        setProduction(prodRes.data);
        setVenue(venueRes.data);
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

  const updateTierQty = (tierId: string, delta: number) => {
    setTierQuantities(prev => {
      const current = prev[tierId] || 0;
      const next = Math.max(0, Math.min(gaAvailable, current + delta));
      return { ...prev, [tierId]: next };
    });
  };

  // Compute totals
  let ticketCount = 0;
  let subtotal = 0;
  let tax = 0;
  let total = 0;

  if (hasTiers) {
    if (isAssignedSeating) {
      // Assigned seating + tiers: all selected seats use the selected tier
      const tier = priceTiers.find(t => t.id === selectedTierId);
      ticketCount = selectedSeats.size;
      const result = computeOrderTotals(ticketCount, tier?.price || 0);
      subtotal = result.subtotal;
      tax = result.tax;
      total = result.total;
    } else {
      // GA + tiers: per-tier quantities
      const items: TicketLineItem[] = priceTiers
        .filter(t => (tierQuantities[t.id] || 0) > 0)
        .map(t => ({ tierId: t.id, tierName: t.tier_name, price: t.price, quantity: tierQuantities[t.id] }));
      const result = computeLineItemTotals(items);
      ticketCount = result.totalCount;
      subtotal = result.subtotal;
      tax = result.tax;
      total = result.total;
    }
  } else {
    // No tiers — legacy single price
    ticketCount = isAssignedSeating ? selectedSeats.size : gaQuantity;
    const result = computeOrderTotals(ticketCount, showing?.ticket_price || 0);
    subtotal = result.subtotal;
    tax = result.tax;
    total = result.total;
  }

  const handlePurchase = async () => {
    if (!user) { navigate('/auth'); return; }
    if (ticketCount === 0) { toast.error('Please select at least one ticket'); return; }

    setPurchasing(true);
    try {
      let ticketRows;

      if (hasTiers) {
        if (isAssignedSeating) {
          const tier = priceTiers.find(t => t.id === selectedTierId)!;
          ticketRows = buildTicketRows({
            lineItems: [{
              tierId: tier.id,
              tierName: tier.tier_name,
              price: tier.price,
              quantity: selectedSeats.size,
              seatIds: Array.from(selectedSeats),
            }],
            userId: user.id,
            showingId: id!,
            paymentMethod: 'online',
          });
        } else {
          const items: TicketLineItem[] = priceTiers
            .filter(t => (tierQuantities[t.id] || 0) > 0)
            .map(t => ({ tierId: t.id, tierName: t.tier_name, price: t.price, quantity: tierQuantities[t.id] }));
          ticketRows = buildTicketRows({
            lineItems: items,
            userId: user.id,
            showingId: id!,
            paymentMethod: 'online',
          });
        }
      } else {
        ticketRows = buildTicketRows({
          selectedSeats: isAssignedSeating ? selectedSeats : new Set<string>(),
          quantity: isAssignedSeating ? undefined : gaQuantity,
          userId: user.id,
          showingId: id!,
          ticketPrice: showing.ticket_price,
          paymentMethod: 'online',
        });
      }

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

  const meta = getProductionMeta(productionType);
  const Icon = meta.icon;

  // Price display: show range if tiers, otherwise single price
  const priceDisplay = hasTiers
    ? `$${Math.min(...priceTiers.map(t => t.price)).toFixed(2)}–$${Math.max(...priceTiers.map(t => t.price)).toFixed(2)}`
    : `$${Number(showing.ticket_price).toFixed(2)} per ticket`;

  return (
    <div className="container py-8 px-4 max-w-5xl">
      {/* Production info */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">← Back</Button>
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{production?.title}</h1>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                {meta.label}
              </span>
            </div>
            {production?.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{production.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {format(new Date(showing.start_time), 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {format(new Date(showing.start_time), 'h:mm a')}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> {priceDisplay}
              </span>
              {venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {venue.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Seating Map or GA Quantity */}
        <div className="lg:col-span-2 space-y-6">
          {isAssignedSeating ? (
            <>
              {hasTiers && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="font-display text-lg">Select Ticket Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {priceTiers.map(tier => (
                        <Button
                          key={tier.id}
                          variant={selectedTierId === tier.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTierId(tier.id)}
                        >
                          {tier.tier_name} — ${tier.price.toFixed(2)}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Select a ticket type, then pick your seats below
                    </p>
                  </CardContent>
                </Card>
              )}
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
            </>
          ) : (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display text-lg">General Admission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This is a general admission event — seating is first-come, first-served.
                </p>
                {hasTiers ? (
                  <div className="space-y-3">
                    {priceTiers.map(tier => (
                      <div key={tier.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div>
                          <p className="font-medium">{tier.tier_name}</p>
                          <p className="text-sm text-muted-foreground">${tier.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="icon" onClick={() => updateTierQty(tier.id, -1)} disabled={(tierQuantities[tier.id] || 0) === 0}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-xl font-bold w-8 text-center">{tierQuantities[tier.id] || 0}</span>
                          <Button variant="outline" size="icon" onClick={() => updateTierQty(tier.id, 1)} disabled={ticketCount >= gaAvailable}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">{gaAvailable} tickets available</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Tickets</p>
                      <p className="text-xs text-muted-foreground">{gaAvailable} available</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" onClick={() => setGaQuantity(q => Math.max(0, q - 1))} disabled={gaQuantity === 0}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-xl font-bold w-8 text-center">{gaQuantity}</span>
                      <Button variant="outline" size="icon" onClick={() => setGaQuantity(q => Math.min(gaAvailable, q + 1))} disabled={gaQuantity >= gaAvailable}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
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
                    {hasTiers ? (
                      isAssignedSeating ? (
                        <>
                          {(() => {
                            const tier = priceTiers.find(t => t.id === selectedTierId);
                            return (
                              <div className="flex justify-between">
                                <span>{tier?.tier_name} × {selectedSeats.size}</span>
                                <span>${((tier?.price || 0) * selectedSeats.size).toFixed(2)}</span>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        priceTiers
                          .filter(t => (tierQuantities[t.id] || 0) > 0)
                          .map(tier => (
                            <div key={tier.id} className="flex justify-between">
                              <span>{tier.tier_name} × {tierQuantities[tier.id]}</span>
                              <span>${(tier.price * tierQuantities[tier.id]).toFixed(2)}</span>
                            </div>
                          ))
                      )
                    ) : (
                      isAssignedSeating ? (
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
                      )
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
