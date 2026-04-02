import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210, 70%, 55%)',
  'hsl(340, 65%, 55%)',
  'hsl(160, 55%, 45%)',
  'hsl(45, 80%, 55%)',
];

interface TicketRow {
  price: number;
  total_price: number;
  purchased_at: string;
  status: string;
  payment_method: string;
  showing_id: string;
  showings: {
    movie_id: string | null;
    event_id: string | null;
    concert_id: string | null;
    total_seats: number;
    venue_id: string | null;
    movies: { title: string; genre: string | null } | null;
    events: { title: string; genre: string | null } | null;
    concerts: { title: string; genre: string | null } | null;
    venues: { name: string } | null;
  } | null;
}

export default function AnalyticsTab() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('tickets')
        .select('price, total_price, purchased_at, status, payment_method, showing_id, showings(movie_id, event_id, concert_id, total_seats, venue_id, movies(title, genre), events(title, genre), concerts(title, genre), venues(name))')
        .order('purchased_at', { ascending: true });
      setTickets((data as unknown as TicketRow[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-center text-muted-foreground py-12">Loading analytics…</p>;

  const confirmed = tickets.filter(t => t.status === 'confirmed');

  // --- Revenue over time (last 30 days, daily) ---
  const revenueByDay: Record<string, number> = {};
  confirmed.forEach(t => {
    const day = new Date(t.purchased_at).toISOString().slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] || 0) + Number(t.total_price);
  });
  const revenueSeries = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, revenue]) => ({ date: date.slice(5), revenue: +revenue.toFixed(2) }));

  // --- Revenue by category ---
  let movieRev = 0, eventRev = 0, concertRev = 0;
  confirmed.forEach(t => {
    const s = t.showings;
    if (!s) return;
    if (s.movie_id) movieRev += Number(t.total_price);
    else if (s.event_id) eventRev += Number(t.total_price);
    else if (s.concert_id) concertRev += Number(t.total_price);
  });
  const categoryData = [
    { name: 'Movies', value: +movieRev.toFixed(2) },
    { name: 'Events', value: +eventRev.toFixed(2) },
    { name: 'Concerts', value: +concertRev.toFixed(2) },
  ].filter(d => d.value > 0);

  // --- Top performers (by ticket count) ---
  const perfMap: Record<string, { title: string; count: number; revenue: number }> = {};
  confirmed.forEach(t => {
    const s = t.showings;
    if (!s) return;
    const title = s.movies?.title || s.events?.title || s.concerts?.title || 'Unknown';
    if (!perfMap[title]) perfMap[title] = { title, count: 0, revenue: 0 };
    perfMap[title].count += 1;
    perfMap[title].revenue += Number(t.total_price);
  });
  const topPerformers = Object.values(perfMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
    .map(p => ({ ...p, revenue: +p.revenue.toFixed(2) }));

  // --- Venue utilization ---
  const venueMap: Record<string, { name: string; ticketsSold: number; showingIds: Set<string>; totalCapacity: number }> = {};
  confirmed.forEach(t => {
    const s = t.showings;
    if (!s?.venues?.name || !s.venue_id) return;
    const name = s.venues.name;
    if (!venueMap[name]) venueMap[name] = { name, ticketsSold: 0, showingIds: new Set(), totalCapacity: 0 };
    venueMap[name].ticketsSold += 1;
    if (!venueMap[name].showingIds.has(t.showing_id)) {
      venueMap[name].showingIds.add(t.showing_id);
      venueMap[name].totalCapacity += s.total_seats;
    }
  });
  const venueData = Object.values(venueMap).map(v => ({
    name: v.name,
    utilization: v.totalCapacity > 0 ? +((v.ticketsSold / v.totalCapacity) * 100).toFixed(1) : 0,
    tickets: v.ticketsSold,
  }));

  // --- Genre popularity ---
  const genreMap: Record<string, number> = {};
  confirmed.forEach(t => {
    const s = t.showings;
    if (!s) return;
    const genre = s.movies?.genre || s.events?.genre || s.concerts?.genre || 'Other';
    genreMap[genre] = (genreMap[genre] || 0) + 1;
  });
  const genreData = Object.entries(genreMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // --- Summary stats ---
  const totalRevenue = confirmed.reduce((s, t) => s + Number(t.total_price), 0);
  const avgPerTicket = confirmed.length > 0 ? totalRevenue / confirmed.length : 0;
  const refundCount = tickets.filter(t => t.status === 'refunded').length;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={<DollarSign className="h-5 w-5 text-primary" />} label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} />
        <KPI icon={<TrendingUp className="h-5 w-5 text-primary" />} label="Tickets Sold" value={String(confirmed.length)} />
        <KPI icon={<BarChart3 className="h-5 w-5 text-primary" />} label="Avg / Ticket" value={`$${avgPerTicket.toFixed(2)}`} />
        <KPI icon={<Users className="h-5 w-5 text-destructive" />} label="Refunds" value={String(refundCount)} />
      </div>

      {/* Revenue over time */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Revenue Over Time (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          {revenueSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-center py-8">No revenue data yet.</p>}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue by category */}
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-8">No data yet.</p>}
          </CardContent>
        </Card>

        {/* Genre popularity */}
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Genre Popularity</CardTitle></CardHeader>
          <CardContent>
            {genreData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                    {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-8">No data yet.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Top performers */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Top Performers by Revenue</CardTitle></CardHeader>
        <CardContent>
          {topPerformers.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topPerformers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="title" type="category" width={120} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-center py-8">No data yet.</p>}
        </CardContent>
      </Card>

      {/* Venue utilization */}
      {venueData.length > 0 && (
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Venue Utilization</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={venueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis unit="%" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number, name: string) => name === 'utilization' ? `${v}%` : v} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="utilization" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="glass">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2.5">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
