'use client';

import { useEffect, type ReactNode } from 'react';
import { useProgress } from '@/store/useProgress';
import { useSettings } from '@/store/useSettings';

/** Browser storage is read after hydration; server and initial client markup agree. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useSettings.getState().hydrate();
    useProgress.getState().hydrate();
  }, []);
  return children;
}

export default Providers;
