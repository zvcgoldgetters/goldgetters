import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const goldgettersSectionVariants = cva('border-t border-brand-border', {
  variants: {
    tone: {
      default: 'bg-[image:var(--brand-section-default)]',
      muted: 'bg-[image:var(--brand-section-muted)]',
      soft: 'bg-brand-surface',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});

interface GoldgettersSectionProps
  extends
    React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof goldgettersSectionVariants> {}

export function GoldgettersSection({
  className,
  tone,
  ...props
}: GoldgettersSectionProps) {
  return (
    <section
      className={cn(goldgettersSectionVariants({ tone }), className)}
      {...props}
    />
  );
}
