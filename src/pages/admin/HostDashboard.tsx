import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Ticket, Calendar, Music, PartyPopper, Film } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportContactsCsv } from '@/lib/exportContacts';

interface Assignment {
  id: string;
  event_id: string | null;
  live_performance_id: string | null;
  movie_id: string | null;
  production?: { title: string; type: 'event' | 'concert' | 'movie' };
}

export default function HostDashboard() {
  const { user, isHost, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showings, setShowings] = useState<any[]>([]);
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isHost && !isAdmin) { navigate('/'); return; }
    loadData();
  }, [isHost, isAdmin, authLoading, navigate]);

  async function loadData() {
    if (!user) return;

    const { data: assignmentData } = await supabase
      .from('host_event_assignments')
      .select('*')
      .eq('user_id', user.id);

    if (!assignmentData || assignmentData.length === 0) {
      setLoading(false);
      return;
    }

    const eventIds = assignmentData.filter(a => a.event_id).map(a => a.event_id!);
    const lpIds = assignmentData.filter(a => a.live_performance_id).map(a => a.live_performance_id!);
    const movieIds = assignmentData.filter(a => a.movie_id).map(a => a.movie_id!);

    const [eventsRes, lpRes, moviesRes] = await Promise.all([
      eventIds.length ? supabase.from('events').select('id, title').in('id', eventIds) : { data: [] },
      lpIds.length ? supabase.from('live_performances').select('id, title').in('id', lpIds) : { data: [] },
      movieIds.length ? supabase.from('movies').select('id, title').in('id', movieIds) : { data: [] },
    ]);

    const enriched: Assignment[] = assignmentData.map(a => {
      let production: Assignment['production'];
      if (a.event_id) {
        const ev = (eventsRes.data || []).find((e: any) => e.id === a.event_id);
        production = { title: ev?.title || 'Unknown Event', type: 'event' };
      } else if (a.live_performance_id) {
        const c = (lpRes.data || []).find((c: any) => c.id === a.live_performance_id);
        production = { title: c?.title || 'Unknown Performance', type: 'concert' };
      } else if (a.movie_id) {
        const m = (moviesRes.data || []).find((m: any) => m.id === a.movie_id);
        production = { title: m?.title || 'Unknown Movie', type: 'movie' };
      }
      return { ...a, production };
    });

    setAssignments(enriched);

    const { data: showingsData } = await supabase
      .from('showings')
      .select('*')
      .order('start_time');

    const relevantShowings = (showingsData || []).filter(s =>
      assignmentData.some(a =>
        (a.event_id && s.event_id === a.event_id) ||
        (a.live_performance_id && s.live_performance_id === a.live_performance_id) ||
        (a.movie_id && s.movie_id === a.movie_id)
      )
    );
    setShowings(relevantShowings);

    const counts: Record<string, number> = {};
    for (const s of relevantShowings) {
      const { count } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('showing_id', s.id);
      counts[s.id] = count || 0;
    }
    setTicketCounts(counts);
    setLoading(false);
  }

  const handleExport = async (a: Assignment) => {
    if (!a.production) return;
    const productionId = a.event_id || a.live_performance_id || a.movie_id;
    if (!productionId) return;

    const count = await exportContactsCsv(a.production.type, productionId, a.production.title);
    if (count === null) {
      toast.info('No attendees found for this production');
    } else {
      toast.success(`Exported ${count} contacts`);
    }
  };

  const getIcon = (type?: string) => {
    if (type === 'event') return PartyPopper;
    if (type === 'concert') return Music;
    return Film;
  };

  if (authLoading || loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="container py-8 px-4 max-w-4xl">
      <h1 className="font-display text-3xl font-bold mb-8">Host Dashboard</h1>

      {assignments.length === 0 ? (
        <Card className="glass p-12 text-center">
          <p className="text-muted-foreground text-lg">No events assigned to you yet.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {assignments.map(a => {
            const Icon = getIcon(a.production?.type);
            const productionShowings = showings.filter(s =>
              (a.event_id && s.event_id === a.event_id) ||
              (a.live_performance_id && s.live_performance_id === a.live_performance_id) ||
              (a.movie_id && s.movie_id === a.movie_id)
            );
            const totalTickets = productionShowings.reduce((sum, s) => sum + (ticketCounts[s.id] || 0), 0);

            return (
              <Card key={a.id} className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <CardTitle className="font-display text-xl">{a.production?.title}</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExport(a)}>
                    <Download className="h-4 w-4 mr-1" /> Export Contacts
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Badge variant="secondary" className="text-sm">
                      <Ticket className="h-3.5 w-3.5 mr-1" /> {totalTickets} tickets sold
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      <Calendar className="h-3.5 w-3.5 mr-1" /> {productionShowings.length} showings
                    </Badge>
                  </div>

                  {productionShowings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Showings</p>
                      {productionShowings.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm">
                            {format(new Date(s.start_time), 'EEEE, MMM d, yyyy • h:mm a')}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{ticketCounts[s.id] || 0} tickets</span>
                            <Badge variant="secondary">${Number(s.ticket_price).toFixed(2)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
