'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardStickyHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getBillingPdcs, updatePdcStatus } from '@/lib/actions/billing';
import { formatCentavosToPhp } from '@/lib/status-colors';
import { toast } from 'sonner';

interface BillingPdcTrackerProps {
  canEdit: boolean;
}

export function BillingPdcTracker({ canEdit }: BillingPdcTrackerProps) {
  const router = useRouter();
  const [pdcs, setPdcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getBillingPdcs();
      setPdcs(data);
    } catch {
      toast.error('Failed to load post-dated checks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (checkId: string, newStatus: string) => {
    try {
      const res = await updatePdcStatus({
        check_id: checkId,
        status: newStatus as any,
      });
      if (res.success) {
        toast.success(`Check status updated to ${newStatus}`);
        setPdcs((prev) =>
          prev.map((c) => (c.check_id === checkId ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update check status');
    }
  };

  const filtered = useMemo(() => {
    let result = pdcs;
    if (filter !== 'all') {
      result = result.filter((p) => p.status === filter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const buyer = p.account?.parties?.[0]?.client?.full_name?.toLowerCase() ?? '';
        const bank = (p.bank_name || '').toLowerCase();
        const checkNo = (p.check_number || '').toLowerCase();
        const location = (p.account?.property?.location || '').toLowerCase();
        return buyer.includes(q) || bank.includes(q) || checkNo.includes(q) || location.includes(q);
      });
    }
    return result;
  }, [pdcs, filter, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cleared':
        return (
          <Badge variant="success" shape="pill" dot className="text-[10px] uppercase font-semibold">
            Cleared
          </Badge>
        );
      case 'deposited':
        return (
          <Badge variant="default" shape="pill" dot className="text-[10px] uppercase font-semibold">
            Deposited
          </Badge>
        );
      case 'returned':
        return (
          <Badge variant="destructive" shape="pill" dot className="text-[10px] uppercase font-semibold">
            Returned
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" shape="pill" dot className="text-[10px] uppercase font-semibold">
            Holding
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col">
      {/* Declarative FilterToolbar Header */}
      <CardStickyHeader>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 pb-0 sm:pb-0">
          <div>
            <CardTitle>Post-Dated Check (PDC) Portfolio</CardTitle>
            <CardDescription>
              Monitor maturing checks, track clearance lifecycles, and deposit schedules
            </CardDescription>
          </div>
        </div>

        <FilterToolbar
          tabs={{
            value: filter,
            onChange: setFilter,
            items: [
              { value: 'all', label: 'All Checks', count: pdcs.length },
              { value: 'holding', label: 'Holding', count: pdcs.filter((p) => p.status === 'holding').length },
              { value: 'deposited', label: 'Deposited', count: pdcs.filter((p) => p.status === 'deposited').length },
              { value: 'cleared', label: 'Cleared', count: pdcs.filter((p) => p.status === 'cleared').length },
              { value: 'returned', label: 'Returned', count: pdcs.filter((p) => p.status === 'returned').length },
            ],
          }}
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Search check #, bank, or buyer name...',
          }}
          isFiltered={search !== '' || filter !== 'all'}
          onClear={() => {
            setSearch('');
            setFilter('all');
          }}
        />
      </CardStickyHeader>

      {/* Table / Empty State */}
      <div className="relative w-full overflow-x-auto min-h-[350px]">
        {filtered.length === 0 && !loading ? (
          <EmptyState
            title="No post-dated checks found"
            description="No checks match the active search query or status filter."
            isFiltered={search !== '' || filter !== 'all'}
            onClear={() => {
              setSearch('');
              setFilter('all');
            }}
          />
        ) : (
          <Table className="w-full text-xs">
            <TableHeader className="bg-card sticky top-0 z-10 border-b border-border">
              <TableRow className="bg-card hover:bg-card">
                <TableHead className="w-[180px] text-xs font-semibold">Buyer / Account</TableHead>
                <TableHead className="w-[140px] text-xs font-semibold">Bank</TableHead>
                <TableHead className="text-xs font-semibold">Check #</TableHead>
                <TableHead className="text-xs font-semibold">Maturity Date</TableHead>
                <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Loading post-dated checks portfolio...
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const buyer = item.account?.parties?.[0]?.client?.full_name ?? 'Account';
                  const lot = item.account?.property
                    ? `Blk ${item.account.property.block_number} Lot ${item.account.property.lot_number}`
                    : '';
                  const isUpcoming =
                    item.status === 'holding' &&
                    item.check_date &&
                    new Date(item.check_date).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30;

                  return (
                    <TableRow key={item.check_id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{buyer}</span>
                          <span className="text-[10px] text-muted-foreground">{lot}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{item.bank_name}</TableCell>
                      <TableCell className="font-mono">{item.check_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{item.check_date}</span>
                          {isUpcoming && (
                            <span className="rounded bg-[color-mix(in_srgb,var(--warning)_15%,white)] px-1 py-0.5 text-[9px] font-semibold text-warning">
                              Due Soon
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground">
                        {formatCentavosToPhp(item.amount)}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && item.status === 'holding' && (
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => handleStatusChange(item.check_id, 'deposited')}
                              className="h-6 px-2 text-[10px]"
                            >
                              Deposit
                            </Button>
                          )}
                          {canEdit && item.status === 'deposited' && (
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => handleStatusChange(item.check_id, 'cleared')}
                              className="h-6 px-2 text-[10px] text-success hover:text-success"
                            >
                              Clear
                            </Button>
                          )}
                          {canEdit && item.status === 'deposited' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleStatusChange(item.check_id, 'returned')}
                              className="h-6 px-2 text-[10px]"
                            >
                              Bounce
                            </Button>
                          )}
                          {item.account_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/billing/${item.account_id}`)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
