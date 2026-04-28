import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Film, Ticket, LogOut, Shield, User, CreditCard, Home, MapPin, Mail, Phone } from 'lucide-react';
import kenworthyFullLogo from '@/assets/kenworthy-full-logo.png';

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
            {/* Official Kenworthy K mark — inlined so it inherits currentColor */}
            <svg
              viewBox="0 0 950 950"
              className="h-10 w-10 text-primary transition-colors group-hover:text-accent"
              aria-hidden
              fill="currentColor"
            >
              <path d="M277.02,532.08v-42.88c0-219.27,401.83-216.86,401.83,0,0,13.14,0,27.58,0,42.88l205.5-28.66-201.08-32.1,179.1-92.09-199.39,29.57,141.94-142.77-179.1,88.72,91.23-180.77-142.04,141.52,33-197.26-96,178.76-32-200.73-32,200.73-96-178.76,33,197.26-146.16-141.52,91.24,180.77-174.08-88.71,135.21,142.77-193.21-29.57,174.61,92.09-201.08,32.1,205.49,28.65Z" />
              <path d="M654.53,822.78h-353.18v-327.78c0-189.99,353.17-194.76,353.17,0l.02,327.78ZM425.64,418.97h-45.8c-1.35,0-2.45,1.1-2.45,2.45v358.36c0,1.35,1.1,2.45,2.45,2.45h45.8c1.35,0,2.45-1.1,2.45-2.45v-138.71c0-1.35,1.1-2.45,2.45-2.45h84.66c1.35,0,2.45,1.1,2.45,2.45v138.71c0,1.35,1.1,2.45,2.45,2.45h52.56c1.35,0,2.45-1.1,2.45-2.45v-153.83c0-12.84-9.99-25.72-16.92-33.77s-21.48-16.07-32.93-16.07h-48.16l105.4-155.57c.45-.66-.03-1.56-.83-1.56h-61.87c-.81,0-1.57.4-2.03,1.08l-89.68,132.83v-131.45c0-1.35-1.1-2.45-2.45-2.45Z" />
            </svg>
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
              src={kenworthyFullLogo}
              alt="The Kenworthy Performing Arts Centre"
              width={1920}
              height={453}
              className="h-16 w-auto mb-3 object-contain [filter:invert(1)_brightness(1.05)]"
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
