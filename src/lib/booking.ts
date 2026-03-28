export interface Seat {
  id: string;
  seat_row: string;
  seat_number: number;
  seat_type: string;
}

export const TAX_RATE = 0.06;

export function buildTicketRows({
  selectedSeats,
  quantity,
  userId,
  showingId,
  ticketPrice,
  paymentMethod,
}: {
  selectedSeats: Set<string>;
  quantity?: number;
  userId: string;
  showingId: string;
  ticketPrice: number;
  paymentMethod: string;
}) {
  const price = Number(ticketPrice);
  const taxAmount = Math.round(price * TAX_RATE * 100) / 100;
  const totalPrice = Math.round(price * (1 + TAX_RATE) * 100) / 100;

  const baseRow = {
    user_id: userId,
    showing_id: showingId,
    price,
    tax_rate: TAX_RATE,
    tax_amount: taxAmount,
    total_price: totalPrice,
    qr_code: '',
    status: 'confirmed',
    payment_method: paymentMethod,
  };

  // Assigned seating: one ticket per selected seat
  if (selectedSeats.size > 0) {
    return Array.from(selectedSeats).map(seatId => ({
      ...baseRow,
      seat_id: seatId,
      qr_code: crypto.randomUUID(),
    }));
  }

  // General admission: quantity tickets with no seat assignment
  const count = quantity || 0;
  return Array.from({ length: count }, () => ({
    ...baseRow,
    seat_id: null,
    qr_code: crypto.randomUUID(),
  }));
}

export function computeOrderTotals(ticketCount: number, ticketPrice: number) {
  const subtotal = ticketCount * ticketPrice;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}
