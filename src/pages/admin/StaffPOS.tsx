import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ShoppingCart, Check, Film, DollarSign, User,
  CreditCard, Banknote, Loader2, CheckCircle2, AlertTriangle,
  History, RotateCcw, X,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

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

interface SessionTransaction {
  id: string;
  ticketIds: string[];
  movieTitle: string;
  seatLabels: string[];
  total: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  refunded: boolean;
}

type PaymentMethod = 'cash' | 'card';
type PaymentStatus = 'idle' | 'processing' | 'completed' | 'failed';

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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [squareCheckoutId, setSquareCheckoutId] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  // Transaction history (session-local)
  const [transactions, setTransactions] = useState<SessionTransaction[]>([]);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundingTx, setRefundingTx] = useState<SessionTransaction | null>(null);
  const [refunding, setRefunding] = useState(false);

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
        supabase.from('tickets').select('seat_id').eq('showing_id', selectedShowingId).eq('status', 'confirmed'),
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

  const createTickets = useCallback(async (): Promise<string[]> => {
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

    const { data, error } = await supabase.from('tickets').insert(ticketRows).select('id');
    if (error) throw error;
    return (data || []).map(t => t.id);
  }, [selectedSeats, selectedShowingId, selectedShowing]);

  const refreshTakenSeats = useCallback(async () => {
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('seat_id')
      .eq('showing_id', selectedShowingId)
      .eq('status', 'confirmed');
    setTakenSeatIds(new Set((ticketsData || []).map(t => t.seat_id)));
  }, [selectedShowingId]);

  const addTransaction = useCallback((ticketIds: string[]) => {
    const seatLabels = Array.from(selectedSeats).map(seatId => {
      const seat = seats.find(s => s.id === seatId);
      return seat ? `${seat.seat_row}${seat.seat_number}` : '?';
    });

    const tx: SessionTransaction = {
      id: crypto.randomUUID(),
      ticketIds,
      movieTitle: selectedShowing?.movie_title || 'Unknown',
      seatLabels,
      total,
      paymentMethod,
      timestamp: new Date(),
      refunded: false,
    };
    setTransactions(prev => [tx, ...prev]);
  }, [selectedSeats, seats, selectedShowing, total, paymentMethod]);

  const resetForm = useCallback(() => {
    setSelectedSeats(new Set());
    setPatronEmail('');
    setPatronPhone('');
    setPaymentStatus('idle');
    setSquareCheckoutId(null);
    setIsSimulated(false);
  }, []);

  const handleCashSale = async () => {
    setSelling(true);
    try {
      const ticketIds = await createTickets();
      addTransaction(ticketIds);
      toast.success(
        `${selectedSeats.size} ticket(s) sold (cash)! Receipt sent to ${patronEmail || patronPhone}`,
        { duration: 5000 }
      );
      resetForm();
      await refreshTakenSeats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process sale');
    } finally {
      setSelling(false);
    }
  };

  const handleCardSale = async () => {
    setSelling(true);
    setPaymentStatus('processing');

    try {
      const idempotencyKey = crypto.randomUUID();
      const amountCents = Math.round(total * 100);

      const { data, error } = await supabase.functions.invoke('square-terminal', {
        body: {
          action: 'create_checkout',
          amount_cents: amountCents,
          note: `${selectedShowing!.movie_title} — ${selectedSeats.size} ticket(s)`,
          idempotency_key: idempotencyKey,
        },
      });

      if (error) throw new Error(error.message || 'Failed to create checkout');

      const checkoutId = data.checkout?.id;
      setSquareCheckoutId(checkoutId);
      setIsSimulated(data.simulated || false);

      if (data.simulated || data.checkout?.status === 'COMPLETED') {
        setPaymentStatus('completed');
        const ticketIds = await createTickets();
        addTransaction(ticketIds);
        toast.success(
          `${selectedSeats.size} ticket(s) sold (card)! ${data.simulated ? '(Sandbox simulation)' : ''}`,
          { duration: 5000 }
        );
        resetForm();
        await refreshTakenSeats();
      } else {
        pollCheckoutStatus(checkoutId);
      }
    } catch (err: any) {
      setPaymentStatus('failed');
      toast.error(err.message || 'Payment failed');
    } finally {
      setSelling(false);
    }
  };

  const pollCheckoutStatus = useCallback(async (checkoutId: string) => {
    const maxAttempts = 60;
    let attempt = 0;

    const poll = async () => {
      attempt++;
      try {
        const { data, error } = await supabase.functions.invoke('square-terminal', {
          body: { action: 'get_checkout', checkout_id: checkoutId },
        });

        if (error) throw error;

        const status = data.checkout?.status;
        if (status === 'COMPLETED') {
          setPaymentStatus('completed');
          const ticketIds = await createTickets();
          addTransaction(ticketIds);
          toast.success(`Payment complete! ${selectedSeats.size} ticket(s) sold.`);
          resetForm();
          await refreshTakenSeats();
          return;
        }
        if (status === 'CANCELED' || status === 'CANCEL_REQUESTED') {
          setPaymentStatus('failed');
          toast.error('Payment was canceled on the terminal.');
          return;
        }
        if (attempt < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setPaymentStatus('failed');
          toast.error('Payment timed out. Check the terminal.');
        }
      } catch {
        if (attempt < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setPaymentStatus('failed');
          toast.error('Lost connection while checking payment.');
        }
      }
    };

    poll();
  }, [createTickets, addTransaction, resetForm, refreshTakenSeats, selectedSeats.size]);

  const handleSell = () => {
    if (!selectedShowingId || selectedSeats.size === 0) {
      toast.error('Select a showing and at least one seat');
      return;
    }
    if (!patronEmail && !patronPhone) {
      toast.error('Enter patron email or phone for digital ticket delivery');
      return;
    }

    if (paymentMethod === 'cash') {
      handleCashSale();
    } else {
      handleCardSale();
    }
  };

  const openRefundDialog = (tx: SessionTransaction) => {
    setRefundingTx(tx);
    setRefundDialogOpen(true);
  };

  const handleRefund = async () => {
    if (!refundingTx) return;
    setRefunding(true);
    try {
      // Update ticket status to 'refunded' in the database
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'refunded' })
        .in('id', refundingTx.ticketIds);

      if (error) throw error;

      // Mark transaction as refunded locally
      setTransactions(prev =>
        prev.map(tx => tx.id === refundingTx.id ? { ...tx, refunded: true } : tx)
      );

      toast.success(`Refunded ${refundingTx.seatLabels.length} ticket(s) — $${refundingTx.total.toFixed(2)}`);
      setRefundDialogOpen(false);
      setRefundingTx(null);

      // Refresh taken seats so refunded seats become available again
      if (selectedShowingId) {
        await refreshTakenSeats();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process refund');
    } finally {
      setRefunding(false);
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

          {/* Transaction History */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Session Transactions
                {transactions.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">{transactions.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No transactions yet this session
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Movie</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(tx => (
                        <TableRow key={tx.id} className={tx.refunded ? 'opacity-50' : ''}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(tx.timestamp, 'h:mm a')}
                          </TableCell>
                          <TableCell className="text-sm font-medium max-w-[150px] truncate">
                            {tx.movieTitle}
                          </TableCell>
                          <TableCell className="text-xs">
                            {tx.seatLabels.join(', ')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {tx.paymentMethod === 'cash' ? (
                                <><Banknote className="h-3 w-3 mr-1" /> Cash</>
                              ) : (
                                <><CreditCard className="h-3 w-3 mr-1" /> Card</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            ${tx.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.refunded ? (
                              <Badge variant="destructive" className="text-xs">Refunded</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRefundDialog(tx)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Refund
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Patron info + Payment + Order summary */}
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

          {/* Payment Method */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    paymentMethod === 'cash'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Banknote className={cn('h-8 w-8', paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground')}>
                    Cash
                  </span>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <CreditCard className={cn('h-8 w-8', paymentMethod === 'card' ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', paymentMethod === 'card' ? 'text-primary' : 'text-muted-foreground')}>
                    Card (Square)
                  </span>
                </button>
              </div>

              {paymentMethod === 'card' && (
                <div className="mt-3 p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Sandbox mode — payments are simulated, no real charges</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Order Summary
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

                  {/* Payment status indicator */}
                  {paymentStatus === 'processing' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      <span className="text-sm text-primary font-medium">
                        Waiting for payment on terminal...
                      </span>
                    </div>
                  )}
                  {paymentStatus === 'completed' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="text-sm text-primary font-medium">
                        Payment complete!
                      </span>
                    </div>
                  )}
                  {paymentStatus === 'failed' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <span className="text-sm text-destructive font-medium">
                        Payment failed — try again
                      </span>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSell}
                    disabled={selling || paymentStatus === 'processing'}
                  >
                    {selling || paymentStatus === 'processing' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {paymentMethod === 'cash' ? (
                          <Banknote className="h-4 w-4 mr-1" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-1" />
                        )}
                        {paymentMethod === 'cash'
                          ? `Sell ${selectedSeats.size} Ticket(s) — Cash`
                          : `Charge $${total.toFixed(2)} on Terminal`
                        }
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Refund confirmation dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Confirm Refund
            </DialogTitle>
            <DialogDescription>
              This will cancel the tickets and free up the seats. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {refundingTx && (
            <div className="space-y-3 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Movie</span>
                <span className="font-medium">{refundingTx.movieTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-medium">{refundingTx.seatLabels.join(', ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <Badge variant="outline">{refundingTx.paymentMethod === 'cash' ? 'Cash' : 'Card'}</Badge>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                <span>Refund Amount</span>
                <span className="text-destructive">${refundingTx.total.toFixed(2)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)} disabled={refunding}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={refunding}>
              {refunding ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-1" /> Process Refund</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
