import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const goldgettersStageVariants = cva('relative min-h-full overflow-clip', {
  variants: {
    variant: {
      canvas: 'bg-[image:var(--brand-stage-canvas)] text-brand-ink',
      spotlight: 'bg-[image:var(--brand-stage-spotlight)] text-brand-ink',
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
        <div className="pointer-events-none absolute inset-0 [background:var(--brand-stage-overlay)] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.9),transparent_92%)]" />
      ) : null}
      {children}
    </section>
  );
}
