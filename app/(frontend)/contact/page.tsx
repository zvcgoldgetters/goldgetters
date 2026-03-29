import { GoldgettersContainer } from '@/components/goldgetters/layout/container';
import { GoldgettersGrid } from '@/components/goldgetters/layout/grid';
import { GoldgettersStage } from '@/components/goldgetters/layout/stage';
import { ContactForm } from '@/components/goldgetters/sections/contact-form';
import { ContactIntro } from '@/components/goldgetters/sections/contact-intro';

export default function ContactPage() {
  return (
    <GoldgettersStage variant="spotlight">
      <GoldgettersContainer spacing="md">
        <GoldgettersGrid columns="split" gap="xl">
          <ContactIntro />
          <ContactForm />
        </GoldgettersGrid>
      </GoldgettersContainer>
    </GoldgettersStage>
  );
}
