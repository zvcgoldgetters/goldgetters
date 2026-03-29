import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoldgettersButton } from '@/components/goldgetters/design/button';
import {
  DisplayTitle,
  SectionLabel,
} from '@/components/goldgetters/design/typography';
import { GoldgettersContainer } from '@/components/goldgetters/layout/container';
import { GoldgettersGrid } from '@/components/goldgetters/layout/grid';

const heroStageClass = cva(
  'relative overflow-clip bg-[radial-gradient(circle_at_top_left,rgba(208,164,85,0.28),transparent_32%),radial-gradient(circle_at_72%_18%,rgba(235,193,110,0.22),transparent_22%),linear-gradient(135deg,#f7f1e4_0%,#efe5d5_48%,#e9ddc8_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(161,114,43,0.28),transparent_32%),radial-gradient(circle_at_72%_18%,rgba(255,214,126,0.18),transparent_22%),linear-gradient(135deg,#060606_0%,#0e0d0a_48%,#040404_100%)]',
);

const heroOverlayGridClass = cva(
  'pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(67,49,20,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(67,49,20,0.018)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(180deg,black,transparent_92%)] dark:[background-image:linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)]',
);

const heroBeamLeftClass = cva(
  'pointer-events-none absolute inset-y-[-12%] left-[-9rem] w-[34rem] rounded-full bg-[linear-gradient(180deg,rgba(244,197,104,0.3),transparent_72%)] opacity-50 blur-[14px] [animation:beam-sway_10s_ease-in-out_infinite]',
);

const heroBeamRightClass = cva(
  'pointer-events-none absolute inset-y-[-12%] right-[-11rem] w-[34rem] rounded-full bg-[linear-gradient(180deg,rgba(253,218,146,0.22),transparent_78%)] opacity-50 blur-[14px] [animation:beam-sway_10s_ease-in-out_infinite] [animation-delay:-5s]',
);

const heroContainerLayoutClass = cva('', {
  variants: {
    variant: {
      default:
        'min-h-[30rem] pb-7 pt-14 sm:min-h-[calc(100dvh-5rem)] lg:pb-6 lg:pt-14 [@media(max-height:900px)]:pt-11 [@media(max-height:900px)]:pb-5 [@media(max-height:780px)]:pt-9 [@media(max-height:780px)]:pb-3',
      xl: 'min-h-[30rem] pb-8 pt-12 sm:min-h-[calc(100dvh-5rem)] sm:pb-9 sm:pt-16 lg:pb-8 lg:pt-16 [@media(max-height:900px)]:pt-12 [@media(max-height:900px)]:pb-6 [@media(max-height:780px)]:pt-10 [@media(max-height:780px)]:pb-4',
      compact:
        'min-h-[28rem] pb-5 pt-10 sm:min-h-[calc(100dvh-5rem)] lg:pb-4 lg:pt-10 [@media(max-height:900px)]:pt-8 [@media(max-height:900px)]:pb-4 [@media(max-height:780px)]:pt-7 [@media(max-height:780px)]:pb-3',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const heroContentClass = cva(
  'min-w-0 w-full max-w-full lg:col-span-2 lg:max-w-3xl',
);
const heroTitleClass = cva('', {
  variants: {
    variant: {
      default: 'mt-4',
      xl: 'mt-5',
      compact: 'mt-3',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});
const heroActionsClass = cva('flex flex-col gap-4 sm:flex-row', {
  variants: {
    variant: {
      default: 'mt-6 [@media(max-height:900px)]:mt-4',
      xl: 'mt-7 [@media(max-height:900px)]:mt-5',
      compact: 'mt-4 [@media(max-height:900px)]:mt-3',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});
const heroTitleAccentClass = cva('block break-all text-gold sm:break-normal');

export function GoldgettersHeroStage({
  className,
  ...props
}: React.ComponentProps<'section'>) {
  return <section className={cn(heroStageClass(), className)} {...props} />;
}

export function GoldgettersHeroOverlayGrid({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn(heroOverlayGridClass(), className)} {...props} />;
}

export function GoldgettersHeroBeamLeft({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn(heroBeamLeftClass(), className)} {...props} />;
}

export function GoldgettersHeroBeamRight({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn(heroBeamRightClass(), className)} {...props} />;
}

export function GoldgettersHeroContainer({
  className,
  children,
  variant,
  ...props
}: React.ComponentProps<typeof GoldgettersContainer> &
  VariantProps<typeof heroContainerLayoutClass>) {
  return (
    <GoldgettersContainer {...props}>
      <GoldgettersGrid
        columns="hero"
        align="startCenterLg"
        gap="hero"
        className={cn(heroContainerLayoutClass({ variant }), className)}
      >
        {children}
      </GoldgettersGrid>
    </GoldgettersContainer>
  );
}

export function GoldgettersHeroContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn(heroContentClass(), className)} {...props} />;
}

export function GoldgettersHeroTitle({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof heroTitleClass>) {
  return (
    <div className={cn(heroTitleClass({ variant }), className)} {...props} />
  );
}

export function GoldgettersHeroActions({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof heroActionsClass>) {
  return (
    <div className={cn(heroActionsClass({ variant }), className)} {...props} />
  );
}

export function GoldgettersHeroTitleAccent({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return <span className={cn(heroTitleAccentClass(), className)} {...props} />;
}

type GoldgettersHeroProps = {
  eyebrow: string;
  titleTemplate: React.ReactNode;
  ctaLabel: string;
  ctaHref: string;
} & VariantProps<typeof heroContainerLayoutClass>;

export function GoldgettersHero({
  eyebrow,
  titleTemplate,
  ctaLabel,
  ctaHref,
  variant = 'default',
}: GoldgettersHeroProps) {
  return (
    <GoldgettersHeroStage>
      <GoldgettersHeroOverlayGrid />
      <GoldgettersHeroBeamLeft />
      <GoldgettersHeroBeamRight />

      <GoldgettersHeroContainer variant={variant}>
        <GoldgettersHeroContent>
          <SectionLabel>{eyebrow}</SectionLabel>
          <GoldgettersHeroTitle variant={variant}>
            <DisplayTitle asChild size="hero" className="max-w-full">
              <h1 className="max-w-full break-words">{titleTemplate}</h1>
            </DisplayTitle>
          </GoldgettersHeroTitle>
          <GoldgettersHeroActions variant={variant}>
            <GoldgettersButton asChild size="lg" className="w-full sm:w-auto">
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </GoldgettersButton>
          </GoldgettersHeroActions>
        </GoldgettersHeroContent>
      </GoldgettersHeroContainer>
    </GoldgettersHeroStage>
  );
}
