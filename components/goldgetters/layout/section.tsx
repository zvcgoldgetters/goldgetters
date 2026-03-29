import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const goldgettersSectionVariants = cva(
  'border-t border-[#583f15]/8 dark:border-white/10',
  {
    variants: {
      tone: {
        default:
          'bg-[linear-gradient(180deg,#f8f2e8_0%,#f5eee2_100%)] dark:bg-[linear-gradient(180deg,#080808_0%,#080808_100%)]',
        muted:
          'bg-[linear-gradient(180deg,#f2e7d5_0%,#eee1cc_46%,#f7f2e9_100%)] dark:bg-[linear-gradient(180deg,#0c0c0c_0%,#14110d_46%,#0b0b0b_100%)]',
        soft: 'bg-[#f6efe3] dark:bg-black',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

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
