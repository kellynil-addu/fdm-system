'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Search, ChevronRight, X, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="flex flex-col gap-4">
      {/* Alert Header if pending items exist */}
      {pendingCount > 0 && (
        <div className="mx-4 sm:mx-6 mt-4 flex items-center justify-between rounded-lg border border-warning/40 bg-warning/10 p-3 text-warning">
          <div className="flex items-center gap-2 text-xs font-medium">
            <ShieldAlert className="h-4 w-4" />
            <span>
              {pendingCount} legacy workbook discrepancy flagged for manual staff verification.
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            System dynamic ledger recomputations are active.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 border-b border-border">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by buyer or discrepancy type..."
            className="pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'resolved', label: 'Resolved' },
            { id: 'all', label: 'All Items' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="relative w-full overflow-x-auto">
        <Table className="w-full text-xs">
          <TableHeader className="bg-muted/40 sticky top-0 z-10 border-b border-border">
            <TableRow>
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
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading discrepancy review queue...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-medium text-foreground">Review Queue Clear</span>
                    <span className="text-[11px] text-muted-foreground">
                      No unresolved import discrepancies flagged.
                    </span>
                  </div>
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
                        className="text-[10px] uppercase font-semibold"
                      >
                        {item.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && isPending && (
                          <Button
                            variant="outline"
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
      </div>
    </div>
  );
}
