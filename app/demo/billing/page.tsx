'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DirectionD1,
  DirectionD2,
  DirectionD3,
} from './directions';
import {
  CommandCenterQueueFirst,
  CommandCenterTabbed,
  CommandCenterSplitConsole,
} from './command-center-directions';
import {
  DEMO_ACCOUNTS,
  FORMAT_CURRENCY,
  FIXTURE_ARREARS_ACCOUNT,
} from './fixtures';
import type { BillingAccountSummary } from '@/lib/types/billing';
import {
  Columns2,
  ListOrdered,
  Maximize2,
  CheckCircle,
  Receipt,
  User,
  Building,
  AlertCircle,
  Clock,
  Sparkles,
  Play,
  LayoutTemplate,
  Kanban,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

const COMMAND_CENTER_CONCEPTS = [
  {
    id: 'CC-A',
    title: 'Concept A — Queue-First Operational Hub (Recommended)',
    badge: 'Alert Ribbons + Drawer',
    desc: 'Persistent action ribbons for urgent PDCs and Excel discrepancies sit directly above the accounts ledger. Clicking an alert pops open an inspector drawer without losing your table position or search filters.',
    tradeoff: 'Combines multiple queues on one page, requiring visual hierarchy discipline.',
    Component: CommandCenterQueueFirst,
  },
  {
    id: 'CC-B',
    title: 'Concept B — Full Tabbed Command Center',
    badge: 'Isolated Tabs',
    desc: 'Top horizontal tabs completely separate the Accounts Ledger, PDC Portfolio, and Review Queue into independent full-screen views.',
    tradeoff: 'Staff must leave the accounts table to check maturing checks or pending import flags.',
    Component: CommandCenterTabbed,
  },
  {
    id: 'CC-C',
    title: 'Concept C — Master-Detail Split Console',
    badge: 'Side-by-Side Console',
    desc: 'Left 60% is a dense accounts table, right 40% is an active pinned inspector displaying account aging, maturing checks, and discrepancy history.',
    tradeoff: 'Constrains table width on standard 1366x768 screens.',
    Component: CommandCenterSplitConsole,
  },
] as const;

export default function BillingDemoPage() {
  const [activeDemoSection, setActiveDemoSection] = useState<'command-center' | 'payment-wizard'>('command-center');
  const [selectedCcConcept, setSelectedCcConcept] = useState<'CC-A' | 'CC-B' | 'CC-C'>('CC-A');

  // Wizard State
  const [selectedAccount, setSelectedAccount] = useState<BillingAccountSummary>(FIXTURE_ARREARS_ACCOUNT);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [lastPayment, setLastPayment] = useState<{ amount: number; orNumber: string; timestamp: string } | null>(null);

  const activeCc = COMMAND_CENTER_CONCEPTS.find((c) => c.id === selectedCcConcept) ?? COMMAND_CENTER_CONCEPTS[0];
  const ActiveCcComponent = activeCc.Component;

  const handleOpenPayment = (acc: BillingAccountSummary) => {
    setSelectedAccount(acc);
    setIsWizardOpen(true);
  };

  const handlePaymentSuccess = (summary: { amount: number; orNumber: string }) => {
    setLastPayment({
      ...summary,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Top Banner */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            Feature 005 UI Design System Lab
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">/demo/billing</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Billing &amp; Collections UI Architecture Explorer
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Evaluate live interactive design concepts for the complete Feature 005 overhaul. Test the main
          command center landing experience, queue-first operational triage, and the codified 3-step cashier posting wizard.
        </p>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 pt-2 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveDemoSection('command-center')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-all ${
              activeDemoSection === 'command-center'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutTemplate className="h-4 w-4" />
            <span>1. Main Command Center &amp; Queue Layout (FR-001, FR-002)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveDemoSection('payment-wizard')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-all ${
              activeDemoSection === 'payment-wizard'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>2. Cashier Payment Posting Wizard (FR-004 Codified)</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: COMMAND CENTER LAYOUT CONCEPTS */}
      {activeDemoSection === 'command-center' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Concept Switcher */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {COMMAND_CENTER_CONCEPTS.map((concept) => {
              const isSelected = selectedCcConcept === concept.id;
              return (
                <div
                  key={concept.id}
                  onClick={() => setSelectedCcConcept(concept.id as any)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-card shadow-sm'
                      : 'border-border bg-card/60 hover:border-muted-foreground/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={isSelected ? 'default' : 'outline'} className="text-[10px]">
                        {concept.badge}
                      </Badge>
                      {concept.id === 'CC-A' && (
                        <span className="text-[10px] font-bold text-primary uppercase">Recommended</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-foreground">{concept.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{concept.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-border text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Tradeoff:</strong> {concept.tradeoff}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Command Center Canvas */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border bg-muted/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      Live Concept Preview: {activeCc.id}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-1">{activeCc.title}</CardTitle>
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5"
                  onClick={() => handleOpenPayment(FIXTURE_ARREARS_ACCOUNT)}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Test Post Payment Flow
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ActiveCcComponent
                onSelectAccount={handleOpenPayment}
                onOpenPaymentModal={handleOpenPayment}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 2: PAYMENT POSTING WIZARD */}
      {activeDemoSection === 'payment-wizard' && (
        <div className="space-y-6 animate-in fade-in">
          <Card className="border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px]">
                      Codified in Spec (Option B)
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">FR-004 &amp; SC-002</span>
                  </div>
                  <CardTitle className="text-xl font-bold mt-1">
                    Guided 3-Step Cashier Wizard (Direction D2)
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 max-w-2xl">
                    Sequential progressive modal: Step 1 enters tender metadata &amp; OR#; Step 2 reviews the
                    chronological waterfall breakdown against aging with centavo balance validation; Step 3 presents
                    a permanent receipt voucher preview before ledger commit.
                  </CardDescription>
                </div>
                <Button
                  size="lg"
                  className="gap-2 font-semibold shadow-xs"
                  onClick={() => setIsWizardOpen(true)}
                >
                  <Play className="h-4 w-4" />
                  Launch 3-Step Wizard with {selectedAccount.client?.full_name}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Why Option B Won Clarification:
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  In property raw-lot wind-down operations, collection staff frequently cover multiple roles and are not
                  full-time certified accountants. The guided 3-step wizard enforces 100% conscious verification of
                  chronological installment allocations, eliminating accidental under-allocations or misapplied penalties
                  before permanent append-only ledger write.
                </p>
              </div>

              {lastPayment && (
                <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-foreground" />
                    <span>
                      Simulated Payment Posted: <strong className="font-mono">{lastPayment.orNumber}</strong> for{' '}
                      <strong className="font-mono">{FORMAT_CURRENCY.format(lastPayment.amount)}</strong> at{' '}
                      {lastPayment.timestamp}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Ledger Appended
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Render 3-Step Wizard Modal */}
      <DirectionD2
        account={selectedAccount}
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
