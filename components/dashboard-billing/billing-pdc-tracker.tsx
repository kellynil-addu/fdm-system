'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, AlertCircle, Clock, Search, ChevronRight, X } from 'lucide-react';
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
        return <Badge variant="success" className="text-[10px] uppercase font-semibold">Cleared</Badge>;
      case 'deposited':
        return <Badge variant="default" className="text-[10px] uppercase font-semibold">Deposited</Badge>;
      case 'returned':
        return <Badge variant="destructive" className="text-[10px] uppercase font-semibold">Bounced / Returned</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] uppercase font-semibold">Holding</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 border-b border-border">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by check #, bank, or buyer name..."
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['all', 'holding', 'deposited', 'cleared', 'returned'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                filter === s
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All Checks' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="relative w-full overflow-x-auto">
        <Table className="w-full text-xs">
          <TableHeader className="bg-muted/40 sticky top-0 z-10 border-b border-border">
            <TableRow>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading post-dated checks portfolio...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No post-dated checks registered under this filter.
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
                  new Date(item.check_date).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

                return (
                  <TableRow key={item.check_id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{buyer}</span>
                        <span className="text-[10px] text-muted-foreground">{lot}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-medium">{item.bank_name}</TableCell>

                    <TableCell className="font-mono">{item.check_number}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono">{item.check_date}</span>
                        {isUpcoming && (
                          <Badge variant="warning" className="text-[9px] px-1 py-0 font-medium">
                            Due soon
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono font-semibold text-foreground">
                      {formatCentavosToPhp(Number(item.amount || 0))}
                    </TableCell>

                    <TableCell className="text-center">
                      {getStatusBadge(item.status)}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && item.status === 'holding' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(item.check_id, 'deposited')}
                            className="h-6 px-2 text-[10px]"
                          >
                            Deposit
                          </Button>
                        )}
                        {canEdit && item.status === 'deposited' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(item.check_id, 'cleared')}
                              className="h-6 px-2 text-[10px] text-success hover:text-success"
                            >
                              Clear
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(item.check_id, 'returned')}
                              className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                            >
                              Bounce
                            </Button>
                          </>
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
