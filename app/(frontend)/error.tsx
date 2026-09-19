'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function FrontendError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col gap-4 py-8">
      <h1 className="text-3xl font-bold">Er ging iets mis</h1>
      <p className="text-muted-foreground">
        Er is een onverwachte fout opgetreden. Probeer het opnieuw.
      </p>
      <Button type="button" onClick={reset} variant="outline">
        Opnieuw proberen
      </Button>
    </section>
  );
}
