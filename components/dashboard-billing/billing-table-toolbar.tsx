'use client';

import { Search, LayoutGrid, List, FileSpreadsheet, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BillingTab } from '@/lib/hooks/use-billing-accounts';

interface BillingTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeTab: BillingTab;
  onTabChange: (tab: BillingTab) => void;
  counts: Record<string, number>;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  onOpenImportModal: () => void;
  canEdit: boolean;
}

export function BillingTableToolbar({
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  counts,
  viewMode,
  onViewModeChange,
  onOpenImportModal,
  canEdit,
}: BillingTableToolbarProps) {
  const statusPills: Array<{ key: BillingTab; label: string; count: number }> = [
    { key: 'all', label: 'All', count: counts.all ?? 0 },
    { key: 'active', label: 'Active', count: counts.active ?? 0 },
    { key: 'in_arrears', label: 'In Arrears', count: counts.in_arrears ?? counts.delinquent ?? 0 },
    { key: 'matured', label: 'Matured', count: counts.matured ?? 0 },
    { key: 'cleared', label: 'Cleared', count: counts.cleared ?? 0 },
    { key: 'forfeited', label: 'Forfeited', count: counts.forfeited ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-6">
      {/* Top row: Search input, import button, and view mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by buyer, lot, or OR number..."
            className="pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImportModal}
              className="gap-2 text-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Import Legacy SOA
            </Button>
          )}

          <div className="hidden sm:flex items-center rounded-lg border border-border p-0.5">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              className="h-7 w-7 p-0"
              aria-label="Table view"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('cards')}
              className="h-7 w-7 p-0"
              aria-label="Card view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom row: Operational status pills */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        {statusPills.map(({ key, label, count }) => {
          const isActive = activeTab === key || (key === 'in_arrears' && activeTab === 'delinquent');
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{label}</span>
              <Badge
                variant={isActive ? 'outline' : 'secondary'}
                className={`h-4 min-w-[1.25rem] rounded-full px-1 text-[10px] ${
                  isActive ? 'border-primary-foreground/30 text-primary-foreground' : ''
                }`}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
