'use client';

import type { ReactNode } from 'react';
import { SearchX, Inbox, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  isFiltered?: boolean;
  onClear?: () => void;
  controller?: { isFiltered: boolean; clearAll: () => void };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  isFiltered: isFilteredProp,
  onClear,
  controller,
  className,
}: EmptyStateProps) {
  const isFiltered = isFilteredProp ?? controller?.isFiltered ?? false;
  const handleClear = onClear ?? controller?.clearAll;

  const defaultTitle = isFiltered ? 'No matching records found' : 'No records yet';
  const defaultDesc = isFiltered
    ? 'Try adjusting your search criteria or clearing active filters.'
    : 'No items are currently recorded in this section.';

  const displayTitle = title ?? defaultTitle;
  const displayDesc = description ?? defaultDesc;

  return (
    <div
      className={cn(
        'flex h-full min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-10 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-row-hover text-muted-foreground border border-border">
        {icon ?? (isFiltered ? <SearchX className="h-5 w-5" /> : <Inbox className="h-5 w-5" />)}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{displayTitle}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{displayDesc}</p>
      </div>

      {isFiltered && handleClear ? (
        <Button
          variant="quiet"
          size="sm"
          onClick={handleClear}
          className="gap-1.5 mt-2 text-xs"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      ) : (
        action && <div className="mt-2">{action}</div>
      )}
    </div>
  );
}
