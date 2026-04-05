import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const goldgettersStackVariants = cva('flex flex-col', {
  variants: {
    gap: {
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    gap: 'lg',
  },
});

interface GoldgettersStackProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof goldgettersStackVariants> {}

export function GoldgettersStack({
  className,
  gap,
  ...props
}: GoldgettersStackProps) {
  return (
    <div
      className={cn(goldgettersStackVariants({ gap }), className)}
      {...props}
    />
  );
}
