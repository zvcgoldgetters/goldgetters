import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  BodyText,
  DisplayTitle,
  SectionLabel,
} from '@/components/goldgetters/design/typography';
import { GoldgettersStack } from '@/components/goldgetters/layout/stack';

const goldgettersInfoGridVariants = cva('grid gap-8', {
  variants: {
    columns: {
      one: 'grid-cols-1',
      two: 'grid-cols-1 sm:grid-cols-2',
    },
  },
  defaultVariants: {
    columns: 'one',
  },
});

interface GoldgettersInfoGridProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof goldgettersInfoGridVariants> {}

export function GoldgettersInfoGrid({
  className,
  columns,
  ...props
}: GoldgettersInfoGridProps) {
  return (
    <div
      className={cn(goldgettersInfoGridVariants({ columns }), className)}
      {...props}
    />
  );
}

interface GoldgettersLabeledInfoItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  title: string;
  copy: string;
}

export function GoldgettersLabeledInfoItem({
  label,
  title,
  copy,
  className,
  ...props
}: GoldgettersLabeledInfoItemProps) {
  return (
    <GoldgettersStack className={className} gap="md" {...props}>
      <SectionLabel>{label}</SectionLabel>
      <DisplayTitle asChild size="panel">
        <p>{title}</p>
      </DisplayTitle>
      <BodyText size="base" tone="default">
        {copy}
      </BodyText>
    </GoldgettersStack>
  );
}
