import kenworthyFullLogo from '@/assets/kenworthy-full-logo.png';
import { cn } from '@/lib/utils';

/**
 * Source artwork is black-on-transparent. The site's default surface is
 * the deep marquee black, so we invert the artwork to read as cream/white.
 * Pass `tone="on-light"` anywhere the logo sits on a pale surface
 * (e.g. printed receipts, light-themed emails, future light cards) so it
 * renders in its natural black form. `tone="auto"` follows the `.dark`
 * class on <html> for sites that toggle themes.
 */
type LogoTone = 'on-dark' | 'on-light' | 'auto';

interface KenworthyLogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  tone?: LogoTone;
  alt?: string;
}

const TONE_CLASS: Record<LogoTone, string> = {
  'on-dark': '[filter:invert(1)_brightness(1.05)]',
  'on-light': '',
  // Tailwind `dark:` variant — relies on `.dark` on a parent (html/body).
  auto: 'dark:[filter:invert(1)_brightness(1.05)]',
};

export function KenworthyLogo({
  tone = 'on-dark',
  className,
  alt = 'The Kenworthy Performing Arts Centre',
  ...rest
}: KenworthyLogoProps) {
  return (
    <img
      src={kenworthyFullLogo}
      alt={alt}
      width={1920}
      height={453}
      loading="lazy"
      decoding="async"
      className={cn('w-auto object-contain', TONE_CLASS[tone], className)}
      {...rest}
    />
  );
}