'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronRight, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardStickyHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getBillingDiscrepancies } from '@/lib/actions/billing';
import { formatCentavosToPhp } from '@/lib/status-colors';
import { toast } from 'sonner';
import type { BillingImportDiscrepancy } from '@/lib/types/billing';

interface BillingDiscrepancyQueueProps {
  onResolveDiscrepancy: (discrepancy: BillingImportDiscrepancy) => void;
  canEdit: boolean;
}

export function BillingDiscrepancyQueue({
  onResolveDiscrepancy,
  canEdit,
}: BillingDiscrepancyQueueProps) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all'>('pending');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getBillingDiscrepancies();
      setItems(data);
    } catch {
      toast.error('Failed to load import discrepancy review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const buyer = item.account?.parties?.[0]?.client?.full_name?.toLowerCase() ?? '';
        const discType = (item.discrepancy_type || '').toLowerCase();
        const location = (item.account?.property?.location || '').toLowerCase();
        return buyer.includes(q) || discType.includes(q) || location.includes(q);
      });
    }
    return result;
  }, [items, statusFilter, search]);

  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="flex flex-col">
      {/* Declarative FilterToolbar Header */}
      <CardStickyHeader>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 pb-0 sm:pb-0">
          <div>
            <CardTitle>Discrepancy Review Queue</CardTitle>
            <CardDescription>
              Review legacy Excel import variances, formula mismatches, and recomputed balances
            </CardDescription>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="px-4 sm:px-6 pt-3">
            <Alert variant="warning" className="border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,white)]">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>{pendingCount} legacy workbook discrepancy flagged for manual staff verification</AlertTitle>
              <AlertDescription className="text-xs">
                System dynamic ledger recomputations are active. Audit each item against official physical receipts before resolving.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <FilterToolbar
          tabs={{
            value: statusFilter,
            onChange: (val) => setStatusFilter(val as any),
            items: [
              { value: 'pending', label: 'Pending', count: pendingCount },
              { value: 'resolved', label: 'Resolved', count: items.filter((i) => i.status === 'resolved').length },
              { value: 'all', label: 'All Items', count: items.length },
            ],
          }}
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Search by buyer or discrepancy category...',
          }}
          isFiltered={search !== '' || statusFilter !== 'pending'}
          onClear={() => {
            setSearch('');
            setStatusFilter('pending');
          }}
        />
      </CardStickyHeader>

      {/* Table / Empty State */}
      <div className="relative w-full overflow-x-auto min-h-[350px]">
        {filtered.length === 0 && !loading ? (
          <EmptyState
            title="Review queue clear"
            description="No unresolved import discrepancies flagged under this view."
            isFiltered={search !== '' || statusFilter !== 'pending'}
            onClear={() => {
              setSearch('');
              setStatusFilter('pending');
            }}
          />
        ) : (
          <Table className="w-full text-xs">
            <TableHeader className="bg-card sticky top-0 z-10 border-b border-border">
              <TableRow className="bg-card hover:bg-card">
                <TableHead className="w-[180px] text-xs font-semibold">Buyer / Lot</TableHead>
                <TableHead className="text-xs font-semibold">Discrepancy Category</TableHead>
                <TableHead className="text-right text-xs font-semibold">Raw File Value</TableHead>
                <TableHead className="text-right text-xs font-semibold">Recomputed Value</TableHead>
                <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Loading discrepancy review queue...
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const buyer = item.account?.parties?.[0]?.client?.full_name ?? 'Account';
                  const lot = item.account?.property
                    ? `Blk ${item.account.property.block_number} Lot ${item.account.property.lot_number}`
                    : '';
                  const isPending = item.status === 'pending';

                  return (
                    <TableRow key={item.discrepancy_id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground">{buyer}</span>
                          <span className="text-[10px] text-muted-foreground">{lot}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium">
                          {isPending && <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />}
                          <span className="capitalize">{item.discrepancy_type.replace(/_/g, ' ')}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono text-muted-foreground">
                        {typeof item.raw_value === 'number'
                          ? formatCentavosToPhp(item.raw_value)
                          : String(item.raw_value ?? '—')}
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold text-foreground">
                        {typeof item.computed_value === 'number'
                          ? formatCentavosToPhp(item.computed_value)
                          : String(item.computed_value ?? '—')}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant={isPending ? 'warning' : 'success'}
                          shape="pill"
                          dot
                          className="text-[10px] uppercase font-semibold"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && isPending && (
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => onResolveDiscrepancy(item)}
                              className="h-6 px-2 text-[10px]"
                            >
                              Resolve
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/billing/${item.account_id}`)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title="Open Account Workspace"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
