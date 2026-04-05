import React from 'react';
import { GoldgettersGrid } from '@/components/goldgetters/layout/grid';

type GoldgettersShellProps = React.HTMLAttributes<HTMLDivElement>;

export function GoldgettersShell({ ...props }: GoldgettersShellProps) {
  return (
    <GoldgettersGrid
      gap="none"
      rows="shell"
      minHeight="screen"
      overflowX="clip"
      {...props}
    />
  );
}
