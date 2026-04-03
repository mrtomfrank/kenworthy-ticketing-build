import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Film, Music, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface ShowingInfo {
  id: string;
  start_time: string;
  ticket_price: number;
}

interface ProductionDetail {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  trailer_url: string | null;
  rating: string | null;
  genre: string | null;
  duration_minutes?: number;
  ticket_type?: string;
  rsvp_url?: string | null;
  showings: ShowingInfo[];
  type: 'movie' | 'event' | 'concert';
}

interface ProductionDetailDrawerProps {
  production: ProductionDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

const typeIcons = {
  movie: Film,
  event: Sparkles,
  concert: Music,
};

export function ProductionDetailDrawer({ production, open, onOpenChange }: ProductionDetailDrawerProps) {
  if (!production) return null;

  const Icon = typeIcons[production.type];
  const embedUrl = production.trailer_url ? getEmbedUrl(production.trailer_url) : null;
  const directVideo = production.trailer_url && isDirectVideo(production.trailer_url);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Poster / Trailer */}
        <div className="relative">
          {production.trailer_url ? (
            <div className="aspect-video w-full bg-black">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${production.title} trailer`}
                />
              ) : directVideo ? (
                <video src={production.trailer_url} controls className="w-full h-full object-contain" />
              ) : (
                // Fallback: try as iframe
                <iframe src={production.trailer_url} className="w-full h-full" allowFullScreen title={`${production.title} trailer`} />
              )}
            </div>
          ) : production.poster_url ? (
            <div className="aspect-video w-full bg-secondary flex items-center justify-center overflow-hidden">
              <img src={production.poster_url} alt={production.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-video w-full bg-secondary flex items-center justify-center">
              <Icon className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          <SheetHeader className="p-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {production.rating && <Badge>{production.rating}</Badge>}
              {production.genre && <Badge variant="secondary">{production.genre}</Badge>}
              {production.duration_minutes && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {production.duration_minutes} min
                </span>
              )}
            </div>
            <SheetTitle className="font-display text-2xl">{production.title}</SheetTitle>
          </SheetHeader>

          {/* Description */}
          {production.description && (
            <p className="text-muted-foreground leading-relaxed">{production.description}</p>
          )}

          {/* Showings */}
          {production.ticket_type === 'rsvp' && production.rsvp_url ? (
            <div>
              <Button size="lg" className="w-full" asChild>
                <a href={production.rsvp_url} target="_blank" rel="noopener noreferrer">RSVP Now</a>
              </Button>
            </div>
          ) : production.ticket_type === 'info_only' ? null : production.showings.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Upcoming Showings</h3>
              <div className="space-y-2">
                {production.showings.map(showing => (
                  <Button
                    key={showing.id}
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                    asChild
                  >
                    <Link to={`/showing/${showing.id}`} onClick={() => onOpenChange(false)}>
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        {format(new Date(showing.start_time), 'EEEE, MMMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{format(new Date(showing.start_time), 'h:mm a')}</span>
                        <Badge variant="secondary">${showing.ticket_price.toFixed(2)}</Badge>
                      </span>
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming showings scheduled.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
