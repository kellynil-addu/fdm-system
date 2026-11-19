'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WorkflowSteps<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  fallbackLabel = 'Choose a stage',
  allOption,
}: {
  items: readonly { value: T; label: string; description?: string; count?: number }[];
  value: string;
  onChange: (value: T) => void;
  ariaLabel: string;
  fallbackLabel?: string;
  allOption?: { value: T; label: string; count?: number };
}) {
  const selectedIndex = items.findIndex((item) => item.value === value);
  const selected = items[selectedIndex];
  const isAll = allOption && value === allOption.value;

  return (
    <nav aria-label={ariaLabel}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="quiet"
            className="w-full justify-between gap-3 sm:w-auto"
            aria-label={ariaLabel}
          >
            <span className="flex min-w-0 items-center gap-2">
              {selected && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {String(selectedIndex + 1).padStart(2, '0')}
                </span>
              )}
              <span className="truncate">
                {selected?.label ?? (isAll ? allOption.label : fallbackLabel)}
              </span>
              {(selected?.count !== undefined || (isAll && allOption?.count !== undefined)) && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {selected?.count ?? allOption?.count}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)]">
          {allOption && (
            <>
              <DropdownMenuItem
                onSelect={() => onChange(allOption.value)}
                className="gap-2 py-2.5 font-medium"
              >
                <span className="w-5 shrink-0 text-xs text-muted-foreground" />
                <span className="flex-1">{allOption.label}</span>
                {allOption.count !== undefined && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {allOption.count}
                  </span>
                )}
                {isAll && <Check className="h-3.5 w-3.5 shrink-0" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {items.map((item, index) => (
            <DropdownMenuItem
              key={item.value}
              onSelect={() => onChange(item.value)}
              className="gap-2 py-2.5"
            >
              <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-xs tabular-nums text-muted-foreground">{item.count}</span>
              )}
              {value === item.value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
