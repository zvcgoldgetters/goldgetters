import Link from 'next/link';

export default function FrontendNotFound() {
  return (
    <section className="flex flex-col gap-4 py-8">
      <h1 className="text-3xl font-bold">Pagina niet gevonden</h1>
      <p className="text-muted-foreground">
        De pagina die u zoekt bestaat niet of is verplaatst.
      </p>
      <Link href="/" className="underline underline-offset-4">
        Ga terug naar de homepagina
      </Link>
    </section>
  );
}
