import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GoldgettersButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'variant'
>;

const goldgettersButtonBaseClass = [
  'rounded-full',
  'bg-[image:var(--brand-gradient)] bg-[length:180%]',
  'text-brand-accent-foreground',
  'shadow-brand',
  'transition-[transform,background-position,box-shadow] duration-200',
  'hover:-translate-y-px hover:bg-[position:100%_50%]',
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
      variant="default"
      className={cn(goldgettersButtonBaseClass, className)}
      {...props}
    />
  );
}
