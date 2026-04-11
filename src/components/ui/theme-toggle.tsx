import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'switch';
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');
  const tooltip = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  if (variant === 'switch') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={tooltip}
        title={tooltip}
        className={cn(
          'flex items-center justify-between w-full gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-rebel-text-secondary hover:bg-rebel-surface-sunken hover:text-rebel-text transition-colors',
          className,
        )}
      >
        <span className="flex items-center gap-2.5">
          {/* Show what it'll switch TO */}
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          Theme
        </span>

        {/* Track with side markers so the user can see both states at once */}
        <span
          className={cn(
            'relative h-5 w-10 rounded-full transition-colors flex items-center justify-between px-1',
            isDark ? 'bg-rebel-accent' : 'bg-rebel-border-strong',
          )}
        >
          <Sun
            className={cn(
              'w-2.5 h-2.5 transition-opacity',
              isDark ? 'opacity-40 text-white' : 'opacity-90 text-white',
            )}
          />
          <Moon
            className={cn(
              'w-2.5 h-2.5 transition-opacity',
              isDark ? 'opacity-90 text-white' : 'opacity-40 text-white',
            )}
          />
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              isDark ? 'translate-x-[22px]' : 'translate-x-0.5',
            )}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={tooltip}
      title={tooltip}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rebel-border bg-rebel-surface text-rebel-text-secondary hover:text-rebel-text hover:border-rebel-border-strong transition-colors overflow-hidden',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {mounted && (
          <motion.span
            key={isDark ? 'sun' : 'moon'}
            initial={{ y: -16, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 16, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center"
          >
            {/* Show what clicking will switch TO */}
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
