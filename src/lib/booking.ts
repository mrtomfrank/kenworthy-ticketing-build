export interface Seat {
  id: string;
  seat_row: string;
  seat_number: number;
  seat_type: string;
}

export const TAX_RATE = 0.06;

export function buildTicketRows({
  selectedSeats,
  userId,
  showingId,
  ticketPrice,
  paymentMethod,
}: {
  selectedSeats: Set<string>;
  userId: string;
  showingId: string;
  ticketPrice: number;
  paymentMethod: string;
}) {
  return Array.from(selectedSeats).map(seatId => ({
    user_id: userId,
    showing_id: showingId,
    seat_id: seatId,
    price: Number(ticketPrice),
    tax_rate: TAX_RATE,
    tax_amount: Math.round(Number(ticketPrice) * TAX_RATE * 100) / 100,
    total_price: Math.round(Number(ticketPrice) * (1 + TAX_RATE) * 100) / 100,
    qr_code: crypto.randomUUID(),
    status: 'confirmed',
    payment_method: paymentMethod,
  }));
}

export function computeOrderTotals(seatCount: number, ticketPrice: number) {
  const subtotal = seatCount * ticketPrice;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}
