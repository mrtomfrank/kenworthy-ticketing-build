import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock auth to grant staff access
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ isAdmin: true, isStaff: true, isHost: false, loading: false }),
}));

// Mock html5-qrcode (jsdom has no camera)
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    clear = vi.fn();
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Supabase mock: `.from('tickets').select(...).eq(...).maybeSingle()`
// and `.from('tickets').update(...).eq(...)`
const updateEq = vi.fn().mockResolvedValue({ error: null });
const update = vi.fn(() => ({ eq: updateEq }));

let selectResponse: any = { data: null, error: null };
const maybeSingle = vi.fn(() => Promise.resolve(selectResponse));
const selectEq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq: selectEq }));
const from = vi.fn(() => ({ select, update }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => from(table) },
}));

// AudioContext stub
beforeEach(() => {
  updateEq.mockClear();
  update.mockClear();
  from.mockClear();
  (globalThis as any).AudioContext = class {
    currentTime = 0;
    destination = {};
    createOscillator() {
      return { connect: () => {}, frequency: { value: 0 }, type: '', start: () => {}, stop: () => {} };
    }
    createGain() { return { connect: () => {}, gain: { value: 0 } }; }
  };
});

import TicketScanner from './TicketScanner';

function renderScanner() {
  return render(
    <MemoryRouter>
      <TicketScanner />
    </MemoryRouter>
  );
}

async function scanCode(code: string) {
  const input = screen.getByPlaceholderText(/Enter ticket QR code/i);
  fireEvent.change(input, { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: /Validate/i }));
}

describe('TicketScanner - GA, event, and concert tickets', () => {
  it('accepts a general-admission movie ticket and marks it scanned', async () => {
    selectResponse = {
      data: {
        id: 'ticket-ga-1',
        status: 'confirmed',
        scanned_at: null,
        qr_code: 'QR-GA-MOVIE',
        seats: null,
        showings: {
          start_time: '2026-07-10T19:00:00Z',
          movies: { title: 'Casablanca' },
          events: null,
          live_performances: null,
        },
      },
      error: null,
    };

    renderScanner();
    await scanCode('QR-GA-MOVIE');

    await waitFor(() =>
      expect(screen.getByText(/Ticket validated/i)).toBeInTheDocument()
    );
    expect(screen.getByText('Casablanca')).toBeInTheDocument();
    expect(screen.getByText(/General Admission/i)).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ scanned_at: expect.any(String) })
    );
    expect(updateEq).toHaveBeenCalledWith('id', 'ticket-ga-1');
  });

  it('accepts an event ticket (no movie) and marks it scanned', async () => {
    selectResponse = {
      data: {
        id: 'ticket-event-1',
        status: 'confirmed',
        scanned_at: null,
        qr_code: 'QR-EVENT',
        seats: null,
        showings: {
          start_time: '2026-08-01T18:30:00Z',
          movies: null,
          events: { title: 'Silent Film Gala' },
          live_performances: null,
        },
      },
      error: null,
    };

    renderScanner();
    await scanCode('QR-EVENT');

    await waitFor(() =>
      expect(screen.getByText(/Ticket validated/i)).toBeInTheDocument()
    );
    expect(screen.getByText('Silent Film Gala')).toBeInTheDocument();
    expect(updateEq).toHaveBeenCalledWith('id', 'ticket-event-1');
  });

  it('accepts a live performance (concert) ticket and marks it scanned', async () => {
    selectResponse = {
      data: {
        id: 'ticket-concert-1',
        status: 'confirmed',
        scanned_at: null,
        qr_code: 'QR-CONCERT',
        seats: null,
        showings: {
          start_time: '2026-09-12T20:00:00Z',
          movies: null,
          events: null,
          live_performances: { title: 'Palouse Jazz Quartet' },
        },
      },
      error: null,
    };

    renderScanner();
    await scanCode('QR-CONCERT');

    await waitFor(() =>
      expect(screen.getByText(/Ticket validated/i)).toBeInTheDocument()
    );
    expect(screen.getByText('Palouse Jazz Quartet')).toBeInTheDocument();
    expect(updateEq).toHaveBeenCalledWith('id', 'ticket-concert-1');
  });

  it('reports already-scanned tickets without re-updating', async () => {
    selectResponse = {
      data: {
        id: 'ticket-used',
        status: 'confirmed',
        scanned_at: '2026-07-09T18:00:00Z',
        qr_code: 'QR-USED',
        seats: null,
        showings: {
          start_time: '2026-07-09T19:00:00Z',
          movies: null,
          events: { title: 'Community Night' },
          live_performances: null,
        },
      },
      error: null,
    };

    renderScanner();
    await scanCode('QR-USED');

    await waitFor(() =>
      expect(screen.getByText(/Already scanned/i)).toBeInTheDocument()
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects unknown QR codes as invalid', async () => {
    selectResponse = { data: null, error: null };

    renderScanner();
    await scanCode('QR-NOPE');

    await waitFor(() =>
      expect(screen.getByText(/invalid QR code/i)).toBeInTheDocument()
    );
    expect(update).not.toHaveBeenCalled();
  });
});