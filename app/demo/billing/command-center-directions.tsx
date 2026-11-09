'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileSpreadsheet,
  Filter,
  Layers,
  LayoutGrid,
  Receipt,
  Search,
  SlidersHorizontal,
  User,
  X,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react';
import {
  DEMO_ACCOUNTS,
  FIXTURE_PDCS,
  FIXTURE_DISCREPANCIES,
  FORMAT_CURRENCY,
  type MockPdc,
  type MockDiscrepancy,
} from './fixtures';
import type { BillingAccountSummary } from '@/lib/types/billing';

export interface LayoutConceptProps {
  onSelectAccount?: (account: BillingAccountSummary) => void;
  onOpenPaymentModal?: (account: BillingAccountSummary) => void;
}

// ---------------------------------------------------------------------------
// CONCEPT A: Queue-First Operational Hub (Recommended)
// ---------------------------------------------------------------------------
export function CommandCenterQueueFirst({
  onSelectAccount,
  onOpenPaymentModal,
}: LayoutConceptProps) {
  const [activeDrawer, setActiveDrawer] = useState<'pdc' | 'discrepancy' | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const maturingPdcs = FIXTURE_PDCS.filter((p) => p.status === 'holding' && p.days_until_maturity <= 7);
  const pendingDiscrepancies = FIXTURE_DISCREPANCIES.filter((d) => d.status === 'pending');

  return (
    <div className="space-y-4">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Total Receivables
          </span>
          <span className="text-xl font-mono font-bold text-foreground mt-1 block">
            ₱715,500.00
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Across 3 demo accounts</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Collected MTD
          </span>
          <span className="text-xl font-mono font-bold text-foreground mt-1 block">
            ₱38,500.00
          </span>
          <span className="text-[10px] text-foreground mt-0.5 block">4 payments logged</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            In Arrears Accounts
          </span>
          <span className="text-xl font-mono font-bold text-destructive mt-1 block">
            2 Accounts
          </span>
          <span className="text-[10px] text-destructive mt-0.5 block">₱9,200.00 penalties accrued</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Actionable Queues
          </span>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="font-mono text-xs">
              {maturingPdcs.length} PDCs
            </Badge>
            <Badge variant="outline" className="font-mono text-xs text-destructive">
              {pendingDiscrepancies.length} Diff Flags
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Immediate attention</span>
        </div>
      </div>

      {/* HIGH VISIBILITY ACTION RIBBON */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          <span>Active Operational Alerts (Queue-First)</span>
          <span className="text-[10px] normal-case text-muted-foreground font-mono">
            Click an alert to inspect without losing your table position
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* PDC Alert Ribbon */}
          <div
            onClick={() => setActiveDrawer('pdc')}
            className="cursor-pointer p-3.5 rounded-xl border border-border bg-muted/20 hover:border-foreground/30 transition-all flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {maturingPdcs.length} PDC Maturing for Deposit
                  </span>
                  <Badge variant="destructive" className="text-[9px] h-4 px-1 font-mono">
                    Due in 3 Days
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Juan Dela Cruz · BDO #0049281 (₱8,500.00)
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <span>Inspect</span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {/* Discrepancy Alert Ribbon */}
          <div
            onClick={() => setActiveDrawer('discrepancy')}
            className="cursor-pointer p-3.5 rounded-xl border border-border bg-muted/20 hover:border-foreground/30 transition-all flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {pendingDiscrepancies.length} Legacy Excel Discrepancies
                  </span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                    Audit Queue
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Formula mismatches in MountainBreeze &amp; SunriseHills sheets
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <span>Review Diff</span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Persistent Accounts Table */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Accounts Ledger</CardTitle>
              <CardDescription className="text-xs">
                Real-time buyer balances, arrears aging, and primary cashier actions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search buyer, lot, OR#..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs bg-muted/30">
                <TableHead className="font-semibold text-foreground">Buyer Name</TableHead>
                <TableHead className="font-semibold text-foreground">Lot Reference</TableHead>
                <TableHead className="font-semibold text-foreground">Contract Price</TableHead>
                <TableHead className="font-semibold text-foreground">Remaining Principal</TableHead>
                <TableHead className="font-semibold text-foreground">Arrears / Penalties</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {DEMO_ACCOUNTS.map(({ account }) => (
                <TableRow key={account.account_id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <div>
                      <span className="font-semibold text-foreground">{account.client?.full_name}</span>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        {account.client?.tin_number || 'No TIN'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">
                      Blk {account.property.block_number} Lot {account.property.lot_number}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {account.property.location}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    {FORMAT_CURRENCY.format(account.total_contract_price)}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {FORMAT_CURRENCY.format(account.remaining_balance)}
                  </TableCell>
                  <TableCell>
                    {account.installments_behind && account.installments_behind > 0 ? (
                      <div className="space-y-0.5 font-mono">
                        <span className="text-destructive font-semibold">
                          {account.installments_behind} mos behind
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          +{FORMAT_CURRENCY.format(account.penalties_due || 0)} penalty
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Up to date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.status === 'active' && account.installments_behind && account.installments_behind > 0 ? (
                      <Badge variant="outline" className="border-border text-foreground font-semibold">
                        In Arrears
                      </Badge>
                    ) : account.status === 'matured' ? (
                      <Badge variant="outline" className="border-border text-foreground font-semibold">
                        Matured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-border text-foreground font-semibold">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1"
                      onClick={() => onOpenPaymentModal?.(account)}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Post Pay
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Slide-over Queue Inspector Drawer */}
      {activeDrawer && (
        <div className="p-4 rounded-xl border border-primary/30 bg-card shadow-lg space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              {activeDrawer === 'pdc' ? (
                <>
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm">Post-Dated Checks Maturing Queue</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm">Legacy Excel Discrepancy Queue</span>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setActiveDrawer(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {activeDrawer === 'pdc' && (
            <div className="space-y-2 text-xs">
              {FIXTURE_PDCS.map((pdc) => (
                <div key={pdc.check_id} className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pdc.client_name}</span>
                      <span className="text-muted-foreground font-mono">({pdc.lot_label})</span>
                      <Badge variant="outline" className="text-[10px]">{pdc.bank_name}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      Check #{pdc.check_number} · Due: {pdc.check_date} ({pdc.days_until_maturity > 0 ? `In ${pdc.days_until_maturity} days` : 'Past Due'})
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm">{FORMAT_CURRENCY.format(pdc.amount)}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Deposit Check
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDrawer === 'discrepancy' && (
            <div className="space-y-2 text-xs">
              {FIXTURE_DISCREPANCIES.map((disc) => (
                <div key={disc.discrepancy_id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{disc.client_name} ({disc.lot_label})</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{disc.source_filename}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-2 rounded bg-background border border-border font-mono text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Legacy Workbook Cell:</span>
                      <span className="text-destructive font-semibold">{disc.raw_file_value}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Ledger Recalculated:</span>
                      <span className="text-foreground font-semibold">{disc.recomputed_system_value}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">&quot;{disc.explanation}&quot;</p>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs">Apply Manual Note</Button>
                    <Button size="sm" className="h-7 text-xs">Accept Ledger Value</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CONCEPT B: Full Tabbed Command Center
// ---------------------------------------------------------------------------
export function CommandCenterTabbed({
  onSelectAccount,
  onOpenPaymentModal,
}: LayoutConceptProps) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'pdcs' | 'discrepancies'>('accounts');

  return (
    <div className="space-y-4">
      {/* Horizontal Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'accounts', label: 'Billing Accounts Ledger', count: DEMO_ACCOUNTS.length },
          { id: 'pdcs', label: 'Post-Dated Checks Portfolio', count: FIXTURE_PDCS.length },
          { id: 'discrepancies', label: 'Discrepancy Review Queue', count: FIXTURE_DISCREPANCIES.length },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="text-xs h-8 gap-2"
          >
            <span>{tab.label}</span>
            <span className="rounded-full bg-muted/60 px-1.5 py-0.2 text-[10px] font-mono">
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      {activeTab === 'accounts' && (
        <Card className="border-border p-6 text-xs text-muted-foreground text-center">
          <p className="font-semibold text-foreground text-sm">Tab 1: Standalone Accounts Ledger</p>
          <p className="mt-1">Full-screen accounts view. PDCs and Discrepancies are hidden until tab is switched.</p>
        </Card>
      )}

      {activeTab === 'pdcs' && (
        <Card className="border-border p-6 text-xs text-muted-foreground text-center">
          <p className="font-semibold text-foreground text-sm">Tab 2: Standalone Post-Dated Checks Portfolio</p>
          <p className="mt-1">Dedicated full-screen check management view.</p>
        </Card>
      )}

      {activeTab === 'discrepancies' && (
        <Card className="border-border p-6 text-xs text-muted-foreground text-center">
          <p className="font-semibold text-foreground text-sm">Tab 3: Standalone Review Queue</p>
          <p className="mt-1">Dedicated full-screen workbook audit view.</p>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CONCEPT C: Master-Detail Split Console
// ---------------------------------------------------------------------------
export function CommandCenterSplitConsole({
  onSelectAccount,
  onOpenPaymentModal,
}: LayoutConceptProps) {
  const [selectedAccount, setSelectedAccount] = useState<BillingAccountSummary>(DEMO_ACCOUNTS[0].account);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[420px]">
      {/* Left 7 cols: Table */}
      <div className="md:col-span-7 border border-border rounded-xl bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Accounts Directory</h4>
          <span className="text-[10px] text-muted-foreground font-mono">Select a row to pin inspector</span>
        </div>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map(({ account }) => (
            <div
              key={account.account_id}
              onClick={() => setSelectedAccount(account)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                selectedAccount.account_id === account.account_id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/10 hover:bg-muted/30'
              }`}
            >
              <div>
                <span className="font-bold text-foreground">{account.client?.full_name}</span>
                <span className="text-[11px] text-muted-foreground block font-mono">
                  Blk {account.property.block_number} Lot {account.property.lot_number}
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">{FORMAT_CURRENCY.format(account.remaining_balance)}</span>
                <span className="text-[10px] text-destructive block">
                  {account.installments_behind ? `${account.installments_behind} mos behind` : 'Current'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right 5 cols: Pinned Inspector */}
      <div className="md:col-span-5 border border-border rounded-xl bg-card p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="border-b border-border pb-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">Active Selection</span>
              <h4 className="font-bold text-sm text-foreground">{selectedAccount.client?.full_name}</h4>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Blk {selectedAccount.property.block_number} Lot {selectedAccount.property.lot_number}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contract Price:</span>
              <span className="font-semibold">{FORMAT_CURRENCY.format(selectedAccount.total_contract_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Principal:</span>
              <span className="font-semibold text-foreground">{FORMAT_CURRENCY.format(selectedAccount.remaining_balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Penalties Accrued:</span>
              <span className="text-destructive font-bold">{FORMAT_CURRENCY.format(selectedAccount.penalties_due || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Installment:</span>
              <span>{FORMAT_CURRENCY.format(selectedAccount.monthly_amortization)}</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <Button
            size="sm"
            className="w-full gap-1.5 font-semibold"
            onClick={() => onOpenPaymentModal?.(selectedAccount)}
          >
            <Receipt className="h-4 w-4" />
            Launch Payment Wizard
          </Button>
        </div>
      </div>
    </div>
  );
}
