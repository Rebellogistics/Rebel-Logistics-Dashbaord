import { cn } from '@/lib/utils';

type LogoVariant = 'full' | 'mark';

interface LogoProps {
  /** "full" renders the complete wordmark; "mark" shows only the diamond R */
  variant?: LogoVariant;
  /** Target height in pixels — width scales to preserve the aspect ratio */
  height?: number;
  className?: string;
  alt?: string;
}

// Empirical crop values for the supplied master image.
// The diamond mark occupies roughly the left 11% of the full image width.
const MARK_CROP_PERCENT = 11;

export function Logo({
  variant = 'full',
  height = 36,
  className,
  alt = 'Rebel Logistics',
}: LogoProps) {
  if (variant === 'mark') {
    // The mark variant uses the full image as a background so we can crop to
    // just the diamond-R on the left. Width matches height for a square mark.
    const size = height;
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn('inline-block shrink-0 align-middle', className)}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundImage: 'url(/logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left center',
          backgroundSize: `${(100 / MARK_CROP_PERCENT) * 100}% auto`,
        }}
      />
    );
  }

  return (
    <img
      src="/logo.png"
      alt={alt}
      className={cn('block select-none pointer-events-none', className)}
      style={{ height: `${height}px`, width: 'auto' }}
      draggable={false}
    />
  );
}
