'use client';

import { useEffect } from 'react';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FrontendError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="py-8 space-y-4">
      <h1 className="text-3xl font-bold">Er ging iets mis</h1>
      <p className="text-muted-foreground">
        Er is een onverwachte fout opgetreden. Probeer het opnieuw.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border px-4 py-2 hover:bg-muted"
      >
        Opnieuw proberen
      </button>
    </section>
  );
}
