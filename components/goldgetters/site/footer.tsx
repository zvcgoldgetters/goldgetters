import { nl } from '@/lib/i18n/nl';
import { GoldgettersContainer } from '@/components/goldgetters/layout/container';
import { textLinkVariants } from '@/components/goldgetters/design/typography';

export function GoldgettersFooter() {
  return (
    <footer className="border-t border-[#583f15]/8 bg-[#f6efe3] text-[#46351a]/78 dark:border-white/10 dark:bg-black dark:text-white/72">
      <GoldgettersContainer className="flex flex-col items-center justify-between gap-2 py-8 text-center md:flex-row md:text-left">
        <p className="text-sm tracking-[0.04em] text-[#46351a]/68 dark:text-white/66">
          &copy; {new Date().getFullYear()} ZVC Goldgetters.
        </p>
        <span className="text-sm tracking-[0.04em] text-[#46351a]/68 dark:text-white/66">
          {nl.footer.websiteBy}{' '}
          <a
            href="https://www.cotersus.be/"
            target="_blank"
            rel="noopener noreferrer sponsored nofollow"
            className={textLinkVariants({ variant: 'footer' })}
          >
            Cotersus
          </a>
        </span>
      </GoldgettersContainer>
    </footer>
  );
}
