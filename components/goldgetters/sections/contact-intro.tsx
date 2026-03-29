import {
  GoldgettersInfoGrid,
  GoldgettersLabeledInfoItem,
} from '@/components/goldgetters/design/info-block';
import { nl } from '@/lib/i18n/nl';
import {
  BodyText,
  DisplayTitle,
  SectionLabel,
} from '@/components/goldgetters/design/typography';
import { GoldgettersStack } from '@/components/goldgetters/layout/stack';
import { Separator } from '@/components/ui/separator';

export function ContactIntro() {
  return (
    <GoldgettersStack className="max-w-xl" gap="lg">
      <SectionLabel>{nl.contact.intro.label}</SectionLabel>
      <DisplayTitle asChild size="intro">
        <h1>
          {nl.contact.intro.titleStart}
          <span className="text-gold">{nl.contact.intro.titleHighlight}</span>
        </h1>
      </DisplayTitle>
      <BodyText>{nl.contact.intro.body}</BodyText>

      <Separator />

      <GoldgettersInfoGrid columns="two">
        <GoldgettersLabeledInfoItem
          label={nl.contact.intro.reactionLabel}
          title={nl.contact.intro.reactionTitle}
          copy={nl.contact.intro.reactionBody}
        />
        <GoldgettersLabeledInfoItem
          label={nl.contact.intro.purposeLabel}
          title={nl.contact.intro.purposeTitle}
          copy={nl.contact.intro.purposeBody}
        />
      </GoldgettersInfoGrid>
    </GoldgettersStack>
  );
}
