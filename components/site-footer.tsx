export function SiteFooter() {
  return (
    <footer className="mt-auto w-full border-t border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-4 px-4 py-6">
        <p className="text-base text-muted-foreground">
          &copy; {new Date().getFullYear()} ZVC Goldgetters.
        </p>
        <span className="text-base text-muted-foreground">
          Website door{' '}
          <a
            href="https://www.cotersus.be/"
            target="_blank"
            rel="noopener noreferrer sponsored nofollow"
            className="hover:text-foreground transition-colors"
          >
            Cotersus
          </a>
        </span>
      </div>
    </footer>
  );
}
