'use client';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { GoldgettersContainer } from '@/components/goldgetters/layout/container';
import { GoldgettersGrid } from '@/components/goldgetters/layout/grid';
import {
  textLinkVariants,
  Wordmark,
} from '@/components/goldgetters/design/typography';
import { ThemeToggle } from '@/components/theme-toggle';

export function GoldgettersHeader() {
  const items = [{ href: '/contact', label: 'contact' }];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-border bg-[image:var(--brand-header-background)] backdrop-blur-[18px]">
      <GoldgettersContainer inset="header">
        <GoldgettersGrid
          columns="trailingAuto"
          align="center"
          gap="xs"
          paddingY="md"
        >
          <Link href="/" aria-label="ZVC Goldgetters" className="shrink-0">
            <GoldgettersGrid columns="leadingAuto" align="center" gap="sm">
              <Image
                src="/logo-goldgetters.png"
                alt="Goldgetters logo"
                width={48}
                height={48}
                priority
                className="size-10 object-contain sm:size-12"
              />
              <Wordmark className="hidden min-[430px]:block">
                ZVC Goldgetters
              </Wordmark>
            </GoldgettersGrid>
          </Link>
          <GoldgettersGrid columns="trailingAuto" align="center" gap="xs">
            <Link
              href="/contact"
              aria-label="contact"
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-brand-border bg-brand-control px-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-brand-control-foreground md:hidden"
            >
              <MessageSquare className="size-4" />
              <span className="ml-1 hidden min-[370px]:inline">contact</span>
            </Link>
            <nav className="hidden rounded-full border border-brand-border bg-brand-control px-1.5 py-1 backdrop-blur md:block">
              <GoldgettersGrid flow="col" autoCols="max" gap="xs">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={textLinkVariants({ variant: 'nav' })}
                  >
                    {item.label}
                  </Link>
                ))}
              </GoldgettersGrid>
            </nav>
            <ThemeToggle />
          </GoldgettersGrid>
        </GoldgettersGrid>
      </GoldgettersContainer>
    </header>
  );
}
