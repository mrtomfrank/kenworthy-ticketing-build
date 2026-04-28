import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Film, Ticket, LogOut, Shield, User, CreditCard, Home, MapPin, Mail, Phone } from 'lucide-react';
import kenworthyK from '@/assets/kenworthy-k.svg';
import kenworthyWordmark from '@/assets/kenworthy-logo.svg';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isHost, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    // Use direct location change for cross-browser reliability (Firefox races navigate + reload)
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 glass border-b border-accent/20">
        <div className="container flex h-[68px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group" aria-label="The Kenworthy — home">
            {/* Official Kenworthy K mark */}
            <span
              className="relative inline-flex h-10 w-10 items-center justify-center text-primary transition-colors group-hover:text-accent"
              aria-hidden
            >
              <img src={kenworthyK} alt="" className="h-full w-full" style={{ filter: 'none' }} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-xl tracking-wide">The Kenworthy</span>
              <span className="font-serif text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Moscow, Idaho · Since 1926
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1.5" aria-label="Primary">
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild className="h-10">
                  <Link to="/my-tickets">
                    <Ticket className="h-4 w-4 mr-1" /> My Tickets
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="h-10">
                  <Link to="/my-passes">
                    <CreditCard className="h-4 w-4 mr-1" /> Film Passes
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="h-10">
                  <Link to="/profile">
                    <User className="h-4 w-4 mr-1" /> Profile
                  </Link>
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" asChild className="h-10">
                    <Link to="/admin">
                      <Shield className="h-4 w-4 mr-1" /> Admin
                    </Link>
                  </Button>
                )}
                {isHost && !isAdmin && (
                  <Button variant="ghost" size="sm" asChild className="h-10">
                    <Link to="/host">
                      <Home className="h-4 w-4 mr-1" /> Host
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleSignOut} className="h-10">
                  <LogOut className="h-4 w-4 mr-1" /> Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="h-10">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button size="sm" asChild className="h-10 px-5">
                  <Link to="/auth?tab=signup">Get Tickets</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t border-accent/20 bg-card/40">
        <div className="container py-10 grid gap-8 md:grid-cols-3 text-sm">
          <div>
            <img
              src={kenworthyWordmark}
              alt="The Kenworthy Performing Arts Centre"
              className="h-10 w-auto mb-3"
            />
            <p className="font-serif italic text-muted-foreground">
              A century of stories, told one screening at a time.
            </p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> 508 S Main St, Moscow, ID 83843</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent" /> 208-882-4127</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-accent" /> events@kenworthy.org</p>
          </div>
          <div className="md:text-right text-muted-foreground">
            <p className="font-serif">Performing Arts Centre</p>
            <p className="font-serif">Celebrating 100 Years · Est. 1926</p>
            <p className="mt-3 text-xs">© {new Date().getFullYear()} The Kenworthy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
