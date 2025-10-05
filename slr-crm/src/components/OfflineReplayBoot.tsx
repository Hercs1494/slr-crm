'use client';
import { useEffect } from 'react';
import { startOfflineReplay } from '../../../lib/offline';

export default function OfflineReplayBoot() {
  useEffect(() => { startOfflineReplay(); }, []);
  return null;
}
