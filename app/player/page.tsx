import { Suspense } from 'react';
import PlayerClient from './PlayerClient';

export const dynamic = 'force-dynamic';

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" /> }>
      <PlayerClient />
    </Suspense>
  );
}
