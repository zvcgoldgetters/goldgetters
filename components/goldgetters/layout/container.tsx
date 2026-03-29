import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const goldgettersContainerVariants = cva('mx-auto w-full max-w-7xl', {
  variants: {
    inset: {
      default: 'px-5 sm:px-8',
      header: 'px-4 sm:px-8',
    },
    spacing: {
      none: '',
      md: 'py-16 lg:py-24',
      lg: 'py-20 lg:py-24',
    },
  },
  defaultVariants: {
    inset: 'default',
    spacing: 'none',
  },
});

interface GoldgettersContainerProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof goldgettersContainerVariants> {}

export function GoldgettersContainer({
  className,
  inset,
  spacing,
  ...props
}: GoldgettersContainerProps) {
  return (
    <div
      className={cn(
        goldgettersContainerVariants({ inset, spacing }),
        className,
      )}
      {...props}
    />
  );
}
