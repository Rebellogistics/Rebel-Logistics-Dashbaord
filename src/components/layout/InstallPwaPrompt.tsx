import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';

const DISMISSED_KEY = 'rebel.pwa.installPromptDismissed';
const INSTALLED_KEY = 'rebel.pwa.installed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari uses navigator.standalone (non-standard)
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
}

/**
 * Soft "Install Rebel" prompt for mobile users. Hidden if dismissed once,
 * if already running standalone, or on desktop. Two flavours:
 *  - Android / Chrome: native beforeinstallprompt event → "Install" button.
 *  - iOS Safari: gentle hint to "Add to Home Screen" via the share menu.
 */
export function InstallPwaPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') return;
      if (localStorage.getItem(INSTALLED_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    const onInstalled = () => {
      try {
        localStorage.setItem(INSTALLED_KEY, '1');
      } catch {
        /* ignore */
      }
      setHidden(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari never fires beforeinstallprompt — surface the manual hint
    // after a short delay so it doesn't compete with first-run loaders.
    if (isIOS()) {
      const t = window.setTimeout(() => {
        setShowIosHint(true);
        setHidden(false);
      }, 4_000);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        try {
          localStorage.setItem(INSTALLED_KEY, '1');
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* user cancelled or browser refused */
    } finally {
      setDeferred(null);
      setHidden(true);
    }
  };

  if (hidden) return null;

  return (
    <div className="lg:hidden fixed bottom-24 left-4 right-4 z-30 rounded-2xl border border-rebel-border bg-card shadow-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom">
      <div className="w-9 h-9 rounded-xl bg-rebel-accent-surface flex items-center justify-center shrink-0">
        <Smartphone className="w-4 h-4 text-rebel-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Install Rebel on your phone</p>
        {deferred ? (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Faster access from your home screen — one tap to your dashboard.
          </p>
        ) : showIosHint ? (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tap the <span className="font-semibold">Share</span> button in Safari, then{' '}
            <span className="font-semibold">"Add to Home Screen"</span>.
          </p>
        ) : null}
        {deferred && (
          <Button
            size="sm"
            className="mt-2 h-9 bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
            onClick={install}
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
