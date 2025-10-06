'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Lightweight refresher.
 * Matches pages that call: <RealtimeRefresher tables={['appointments']} />
 * No external deps; just forces a refresh periodically.
 */
export default function RealtimeRefresher({ tables }: { tables: string[] }) {
  const router = useRouter();

  useEffect(() => {
    // initial refresh so dashboard reflects latest state
    router.refresh();

    // then refresh every 10s (you can tweak)
    const id = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(id);
  }, [router, tables]);

  return null;
}
