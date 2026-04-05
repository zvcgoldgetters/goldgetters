import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GoldgettersButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'variant'
>;

const goldgettersButtonBaseClass = [
  'rounded-full',
  'bg-[image:var(--gold-gradient)] bg-[length:180%]',
  'text-[var(--goldgetters-button-text)]',
  'shadow-[var(--goldgetters-button-shadow)]',
  'transition-[transform,background-position,box-shadow] duration-200',
  'hover:-translate-y-px hover:bg-[position:100%_50%]',
  'hover:shadow-[var(--goldgetters-button-shadow-hover)]',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-[var(--goldgetters-form-required)]',
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
