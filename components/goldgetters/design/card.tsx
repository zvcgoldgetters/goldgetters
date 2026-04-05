import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const goldgettersCardVariants = cva('relative overflow-hidden', {
  variants: {
    variant: {
      default: '',
      contact: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const goldgettersCardHeaderVariants = cva('gap-4 px-5 pt-5 sm:px-6 sm:pt-6');

const goldgettersCardContentVariants = cva('px-5 pb-5 pt-6 sm:px-6 sm:pb-6', {
  variants: {
    spacing: {
      default: '',
      compact: 'px-4 py-4 sm:px-5 sm:py-5',
    },
  },
  defaultVariants: {
    spacing: 'default',
  },
});

type GoldgettersCardProps = React.ComponentProps<typeof Card> &
  VariantProps<typeof goldgettersCardVariants>;

export function GoldgettersCard({
  className,
  variant,
  ...props
}: GoldgettersCardProps) {
  return (
    <Card
      className={cn(goldgettersCardVariants({ variant }), className)}
      {...props}
    />
  );
}

export function GoldgettersCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader
      className={cn(goldgettersCardHeaderVariants(), className)}
      {...props}
    />
  );
}

type GoldgettersCardContentProps = React.ComponentProps<typeof CardContent> &
  VariantProps<typeof goldgettersCardContentVariants>;

export function GoldgettersCardContent({
  className,
  spacing,
  ...props
}: GoldgettersCardContentProps) {
  return (
    <CardContent
      className={cn(goldgettersCardContentVariants({ spacing }), className)}
      {...props}
    />
  );
}
