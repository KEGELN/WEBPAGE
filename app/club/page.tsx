import { Suspense } from 'react';
import ClubClient from './ClubClient';

export const dynamic = 'force-dynamic';

export default function ClubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ClubClient />
    </Suspense>
  );
}
