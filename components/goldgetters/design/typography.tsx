import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const displayTitleVariants = cva(
  'max-w-full break-words font-display uppercase text-[#18120a]/94 dark:text-white/94',
  {
    variants: {
      size: {
        hero: 'text-[clamp(2.1rem,11vw,5.6rem)] leading-[0.9] tracking-[0.01em] sm:text-7xl lg:text-[8.5rem]',
        panel: 'text-[2rem] leading-[0.95]',
        detail: 'text-[1.15rem] tracking-[0.05em]',
        intro: 'text-[clamp(2.8rem,12vw,3.8rem)] leading-[0.92] sm:text-6xl',
        callout: 'text-[clamp(2rem,4vw,3.2rem)] leading-[0.96]',
      },
      tone: {
        default: '',
      },
    },
    defaultVariants: {
      size: 'panel',
      tone: 'default',
    },
  },
);

type DisplayTitleProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof displayTitleVariants> & {
    asChild?: boolean;
  };

export function DisplayTitle({
  className,
  size,
  tone,
  asChild = false,
  ...props
}: DisplayTitleProps) {
  const Comp = asChild ? Slot : 'h2';
  return (
    <Comp
      className={cn(displayTitleVariants({ size, tone }), className)}
      {...props}
    />
  );
}

export const bodyTextVariants = cva('', {
  variants: {
    size: {
      base: 'text-base leading-7',
      large: 'text-lg leading-8',
      detail: 'text-[0.98rem] leading-7',
    },
    tone: {
      default: 'text-[#382b16]/80 dark:text-white/72',
      muted: 'text-[#40311c]/78 dark:text-white/64',
    },
  },
  defaultVariants: {
    size: 'large',
    tone: 'default',
  },
});

type BodyTextProps = React.HTMLAttributes<HTMLParagraphElement> &
  VariantProps<typeof bodyTextVariants>;

export function BodyText({ className, size, tone, ...props }: BodyTextProps) {
  return (
    <p className={cn(bodyTextVariants({ size, tone }), className)} {...props} />
  );
}

export const textLinkVariants = cva('transition-opacity hover:opacity-75', {
  variants: {
    variant: {
      footer:
        'font-medium text-[#46351a]/78 hover:text-[#1f170a] dark:text-white/72 dark:hover:text-white',
      nav: 'rounded-full px-2.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#493613]/74 transition-colors hover:bg-[#604719]/8 hover:text-[#1f170a] sm:px-4 sm:py-[0.65rem] sm:text-[0.75rem] sm:tracking-[0.22em] dark:text-white/74 dark:hover:bg-white/8 dark:hover:text-white/96',
    },
  },
  defaultVariants: {
    variant: 'nav',
  },
});

const wordmarkVariants = cva('min-w-0 text-gold', {
  variants: {
    variant: {
      header:
        'max-w-[58vw] truncate text-base font-semibold uppercase tracking-[0.14em] sm:max-w-none sm:text-2xl sm:tracking-[0.18em]',
    },
  },
  defaultVariants: {
    variant: 'header',
  },
});

type WordmarkProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof wordmarkVariants>;

export function Wordmark({ className, variant, ...props }: WordmarkProps) {
  return (
    <span className={cn(wordmarkVariants({ variant }), className)} {...props} />
  );
}

export const sectionLabelVariants = cva(
  'max-w-full break-words text-[0.68rem] font-bold uppercase tracking-[0.16em] sm:text-[0.72rem] sm:tracking-[0.28em]',
  {
    variants: {
      tone: {
        default: 'text-[#5d4720]/60 dark:text-white/50',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

type SectionLabelProps = React.HTMLAttributes<HTMLParagraphElement> &
  VariantProps<typeof sectionLabelVariants>;

export function SectionLabel({ className, tone, ...props }: SectionLabelProps) {
  return (
    <p className={cn(sectionLabelVariants({ tone }), className)} {...props} />
  );
}
