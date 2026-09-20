import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GoldgettersButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'variant'
>;

const goldgettersButtonBaseClass = [
  'rounded-full',
  'shadow-brand',
  'transition-[transform,background-position,box-shadow] duration-200',
  'hover:-translate-y-px',
  'hover:shadow-brand-hover',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-brand-accent',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
].join(' ');

export function GoldgettersButton({
  className,
  ...props
}: GoldgettersButtonProps) {
  return (
    <Button
      variant="brand"
      className={cn(goldgettersButtonBaseClass, className)}
      {...props}
    />
  );
}
