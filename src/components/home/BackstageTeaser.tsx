import backstageLogo from '@/assets/backstage-logo.svg';

/**
 * A quiet, speakeasy-styled teaser for the Backstage venue — the
 * after-hours room tucked inside the Kenworthy. Intentionally
 * understated: dim lighting, a hand-lettered sign, and a whispered
 * line of copy. No CTA yet; we're just letting people know it exists.
 */
export function BackstageTeaser() {
  return (
    <section
      aria-label="Backstage at the Kenworthy"
      className="relative overflow-hidden border-t border-accent/20 bg-[hsl(var(--background))]"
    >
      {/* Soft vignette + warm lamp glow to evoke a back-room speakeasy */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 78% 30%, hsl(var(--accent) / 0.18), transparent 55%), radial-gradient(ellipse at 20% 80%, hsl(var(--primary) / 0.10), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.85) 100%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Sign */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-8 rounded-full blur-3xl"
                style={{
                  background:
                    'radial-gradient(circle, hsl(41 65% 56% / 0.25), transparent 70%)',
                }}
              />
              <div
                className="relative w-[280px] md:w-[360px] [transform:rotate(-2deg)]"
                style={{ aspectRatio: '3011.952 / 1387.634' }}
              >
                <img
                  src={backstageLogo}
                  alt="Backstage — a speakeasy room inside the Kenworthy"
                  width={3012}
                  height={1388}
                  className="absolute inset-0 h-full w-full object-contain [filter:drop-shadow(0_0_6px_hsl(333_90%_60%/0.85))_drop-shadow(0_0_18px_hsl(333_85%_55%/0.6))_drop-shadow(0_0_38px_hsl(333_80%_50%/0.45))_drop-shadow(0_8px_30px_rgba(0,0,0,0.6))]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>

          {/* Whisper */}
          <div className="space-y-5 text-center md:text-left">
            <p className="font-serif text-xs uppercase tracking-[0.3em] text-accent">
              After the credits roll
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground">
              There's a room behind the room.
            </h2>
            <p className="font-serif text-lg leading-relaxed text-muted-foreground max-w-md mx-auto md:mx-0">
              Backstage is the Kenworthy's after-hours speakeasy — low light,
              live music, a proper drink. Look for the unmarked door on the
              nights it's open. We'll be sharing what's on the chalkboard here
              soon.
            </p>
            <p className="font-serif italic text-sm text-muted-foreground/80">
              508 S Main St · Moscow, Idaho
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
