import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const goldgettersGridVariants = cva('grid [&>*]:min-w-0', {
  variants: {
    gap: {
      none: '',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      hero: 'gap-7',
      lg: 'gap-6',
      xl: 'gap-8',
    },
    columns: {
      one: '',
      leadingAuto: 'grid-cols-[auto_1fr]',
      trailingAuto: 'grid-cols-[1fr_auto]',
      hero: 'lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.68fr)]',
      twoSm: 'sm:grid-cols-2',
      two: 'lg:grid-cols-2',
      split: 'lg:grid-cols-[0.9fr_1.1fr]',
      contentAside: 'lg:grid-cols-[minmax(0,1.12fr)_22rem]',
      three: 'lg:grid-cols-3',
      trailingAutoSm: 'sm:grid-cols-[1fr_auto]',
    },
    align: {
      start: '',
      center: 'items-center',
      endCenterLg: 'items-end lg:items-center',
      startCenterLg: 'items-start lg:items-center',
      centerSm: 'sm:items-center',
    },
    flow: {
      row: '',
      col: 'grid-flow-col',
    },
    autoCols: {
      none: '',
      max: 'auto-cols-max',
    },
    paddingY: {
      none: '',
      md: 'py-4',
    },
    rows: {
      none: '',
      shell: 'grid-rows-[auto_1fr_auto]',
    },
    minHeight: {
      none: '',
      screen: 'min-h-screen',
    },
    overflowX: {
      visible: '',
      clip: 'overflow-x-clip',
    },
  },
  defaultVariants: {
    gap: 'lg',
    columns: 'one',
    align: 'start',
    flow: 'row',
    autoCols: 'none',
    paddingY: 'none',
    rows: 'none',
    minHeight: 'none',
    overflowX: 'visible',
  },
});

interface GoldgettersGridProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof goldgettersGridVariants> {}

export function GoldgettersGrid({
  className,
  gap,
  columns,
  align,
  flow,
  autoCols,
  paddingY,
  rows,
  minHeight,
  overflowX,
  ...props
}: GoldgettersGridProps) {
  return (
    <div
      className={cn(
        goldgettersGridVariants({
          gap,
          columns,
          align,
          flow,
          autoCols,
          paddingY,
          rows,
          minHeight,
          overflowX,
        }),
        className,
      )}
      {...props}
    />
  );
}
