'use client';

import { useRouter } from 'next/navigation';
import { MapPin, ExternalLink, FileText } from 'lucide-react';
import { IconBox } from '@/components/ui/icon-box';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PROPERTY_STATUS_VARIANT } from '@/lib/status-colors';
import type { PropertyStatus, SubdivisionDisplayStatus } from '@/lib/types/property';

export interface PropertyChipData {
  property_id?: string | null;
  block_number: number;
  lot_number: number;
  location?: string | null;
  status?: PropertyStatus | SubdivisionDisplayStatus | string | null;
  title_number?: string | null;
}

export interface PropertyChipProps {
  property: PropertyChipData;
  variant?: 'default' | 'compact';
  interactive?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
}

export function formatLotRef(block: number, lot: number): string {
  return `Block ${block} Lot ${lot}`;
}

export function PropertyChip({
  property,
  variant = 'default',
  interactive = true,
  onClick,
  className,
}: PropertyChipProps) {
  const router = useRouter();
  const lotLabel = formatLotRef(property.block_number, property.lot_number);
  const href = property.property_id
    ? `/dashboard/properties/map?lot=${encodeURIComponent(property.property_id)}`
    : null;

  const hasTct = Boolean(property.title_number && property.title_number.trim().length > 0);
  const status = property.status as PropertyStatus | undefined;
  const statusVariant =
    status && PROPERTY_STATUS_VARIANT[status] ? PROPERTY_STATUS_VARIANT[status] : 'muted';

  function handleClick(e: React.MouseEvent) {
    if (onClick) {
      e.stopPropagation();
      onClick(e);
      return;
    }
    if (interactive && href) {
      e.stopPropagation();
      router.push(href);
    }
  }

  // --- Compact Mode (Single line, dense for headers and cards) ---
  if (variant === 'compact') {
    return (
      <div
        onClick={interactive && href ? handleClick : undefined}
        role={interactive && href ? 'button' : undefined}
        tabIndex={interactive && href ? 0 : undefined}
        onKeyDown={
          interactive && href
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(e as unknown as React.MouseEvent);
                }
              }
            : undefined
        }
        className={cn(
          'group inline-flex items-center gap-2 rounded-lg border border-border bg-row-hover px-2.5 py-1.5 transition-all text-left',
          interactive &&
            href &&
            'cursor-pointer hover:border-primary/60 hover:bg-[color-mix(in_srgb,var(--row-hover)_80%,white)]',
          className
        )}
      >
        <IconBox size="sm" shape="rounded-md" className="shrink-0 bg-card text-primary">
          <MapPin className="h-3.5 w-3.5" />
        </IconBox>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {lotLabel}
            </span>
            {property.status && (
              <Badge
                variant={statusVariant}
                shape="pill"
                dot={property.status !== 'Closed'}
                className="text-[10px] px-1.5 py-0 shrink-0"
              >
                {property.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            {property.location && <span className="truncate">{property.location}</span>}
            {property.location && hasTct && <span>•</span>}
            {hasTct ? (
              <span className="font-mono text-foreground font-medium shrink-0">
                TCT {property.title_number}
              </span>
            ) : (
              <span className="italic shrink-0">No TCT</span>
            )}
          </div>
        </div>
        {interactive && href && (
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-primary transition-opacity" />
        )}
      </div>
    );
  }

  // --- Default Mode (Card-style) ---
  return (
    <div
      onClick={interactive && href ? handleClick : undefined}
      role={interactive && href ? 'button' : undefined}
      tabIndex={interactive && href ? 0 : undefined}
      onKeyDown={
        interactive && href
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e as unknown as React.MouseEvent);
              }
            }
          : undefined
      }
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-border bg-row-hover p-3 transition-all text-left',
        interactive &&
          href &&
          'cursor-pointer hover:border-primary/60 hover:bg-[color-mix(in_srgb,var(--row-hover)_80%,white)]',
        className
      )}
    >
      <IconBox size="md" shape="rounded-xl" className="shrink-0 bg-card text-primary">
        <MapPin className="h-4 w-4" />
      </IconBox>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {lotLabel}
          </span>
          {property.status && (
            <Badge
              variant={statusVariant}
              shape="pill"
              dot={property.status !== 'Closed'}
              className="text-[10px] shrink-0"
            >
              {property.status}
            </Badge>
          )}
        </div>
        {property.location && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{property.location}</p>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
          {hasTct ? (
            <span className="font-mono font-medium text-foreground">
              TCT {property.title_number}
            </span>
          ) : (
            <span className="italic text-muted-foreground">No TCT recorded</span>
          )}
        </div>
      </div>
      {interactive && href && (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-primary transition-opacity mt-0.5" />
      )}
    </div>
  );
}
