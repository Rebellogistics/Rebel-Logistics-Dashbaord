import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';

const STORAGE_KEY = 'rebel.dispatch.whoDrivingToday';

interface StoredPick {
  date: string;
  name: string;
}

interface UseDriverTodayResult {
  /** The picked driver's name for today, or null if none is set (or the pick is stale). */
  name: string | null;
  /** True when we have no fresh pick for today — DriverShell should open the picker. */
  needsPick: boolean;
  /** Save today's pick. */
  setName: (name: string) => void;
  /** Clear today's pick. */
  clear: () => void;
}

function readPick(): StoredPick | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.date === 'string' &&
      typeof parsed.name === 'string'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function writePick(pick: StoredPick | null) {
  if (typeof window === 'undefined') return;
  try {
    if (pick) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pick));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage may be disabled — silently ignore
  }
}

export function useDriverToday(): UseDriverTodayResult {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [name, setNameState] = useState<string | null>(() => {
    const stored = readPick();
    if (stored && stored.date === todayStr) return stored.name;
    return null;
  });

  // If the calendar day rolls over while the tab stays open, expire the pick.
  useEffect(() => {
    const check = () => {
      const now = format(new Date(), 'yyyy-MM-dd');
      if (now !== todayStr) {
        const stored = readPick();
        if (!stored || stored.date !== now) setNameState(null);
      }
    };
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [todayStr]);

  const setName = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      if (!trimmed) return;
      writePick({ date: todayStr, name: trimmed });
      setNameState(trimmed);
    },
    [todayStr],
  );

  const clear = useCallback(() => {
    writePick(null);
    setNameState(null);
  }, []);

  return { name, needsPick: !name, setName, clear };
}
