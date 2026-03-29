import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const goldgettersStageVariants = cva('relative min-h-full overflow-clip', {
  variants: {
    variant: {
      canvas:
        'bg-[linear-gradient(180deg,#faf6ee_0%,#f3ebdc_100%)] text-[#17120d] dark:bg-[linear-gradient(180deg,#050505_0%,#080808_100%)] dark:text-white',
      spotlight:
        'bg-[radial-gradient(circle_at_16%_18%,rgba(177,126,48,0.12),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(255,219,146,0.18),transparent_18%),linear-gradient(180deg,#faf5ea_0%,#f2e8d8_42%,#ede2cf_100%)] text-[#17120d] dark:bg-[radial-gradient(circle_at_16%_18%,rgba(177,126,48,0.16),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(255,219,146,0.08),transparent_18%),linear-gradient(180deg,#060606_0%,#0a0908_42%,#050505_100%)] dark:text-white',
    },
  },
  defaultVariants: {
    variant: 'spotlight',
  },
});

interface GoldgettersStageProps
  extends
    React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof goldgettersStageVariants> {}

export function GoldgettersStage({
  className,
  variant,
  children,
  ...props
}: GoldgettersStageProps) {
  return (
    <section
      className={cn(goldgettersStageVariants({ variant }), className)}
      {...props}
    >
      {variant === 'spotlight' ? (
        <div className="pointer-events-none absolute inset-0 [background:linear-gradient(90deg,transparent_0%,rgba(217,165,74,0.05)_46%,transparent_100%)] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.9),transparent_92%)]" />
      ) : null}
      {children}
    </section>
  );
}
