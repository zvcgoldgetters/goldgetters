import { nl } from '@/lib/i18n/nl';
import {
  GoldgettersHero,
  GoldgettersHeroTitleAccent,
} from '@/components/goldgetters/design/hero';

export function HomeHeroSection() {
  return (
    <GoldgettersHero
      variant="xl"
      eyebrow={nl.frontend.homeHeroSection.eyebrow}
      titleTemplate={
        <>
          ZVC
          <GoldgettersHeroTitleAccent>Goldgetters</GoldgettersHeroTitleAccent>
        </>
      }
      ctaLabel={nl.frontend.homeHeroSection.contactCta}
      ctaHref="/contact"
    />
  );
}
