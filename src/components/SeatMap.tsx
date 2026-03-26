import { cn } from '@/lib/utils';
import type { Seat } from '@/lib/booking';

interface SeatMapProps {
  seats: Seat[];
  takenSeatIds: Set<string>;
  selectedSeats: Set<string>;
  onToggleSeat: (seatId: string) => void;
  loading?: boolean;
}

export function SeatMap({ seats, takenSeatIds, selectedSeats, onToggleSeat, loading }: SeatMapProps) {
  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading seats...</p>;
  }

  const seatRows = seats.reduce<Record<string, Seat[]>>((acc, seat) => {
    (acc[seat.seat_row] = acc[seat.seat_row] || []).push(seat);
    return acc;
  }, {});

  return (
    <div>
      {/* Screen */}
      <div className="mb-8 text-center">
        <div className="mx-auto w-3/4 h-2 bg-primary/30 rounded-full mb-1" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Screen</p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground mb-4">
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
                  onClick={() => onToggleSeat(seat.id)}
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
    </div>
  );
}
