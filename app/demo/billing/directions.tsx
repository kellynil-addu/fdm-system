'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Receipt,
  RotateCcw,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Printer,
  Sparkles,
} from 'lucide-react';
import type { BillingAccountSummary, PaymentMode } from '@/lib/types/billing';
import {
  calculateWaterfall,
  FORMAT_CURRENCY,
  type WaterfallItem,
} from './fixtures';

export interface ConceptModalProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess?: (summary: { amount: number; orNumber: string }) => void;
}

// ---------------------------------------------------------------------------
// DIRECTION D1: Split-Pane Reactive Waterfall (Two-Column Modal)
// ---------------------------------------------------------------------------
export function DirectionD1({
  account,
  open,
  onOpenChange,
  onPaymentSuccess,
}: ConceptModalProps) {
  const [tenderedAmount, setTenderedAmount] = useState<number>(15000);
  const [orNumber, setOrNumber] = useState<string>('OR-2026-9041');
  const [orSeries, setOrSeries] = useState<string>('Main');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [checkBank, setCheckBank] = useState<string>('BDO - Samal');
  const [checkNumber, setCheckNumber] = useState<string>('0049281');
  const [remarks, setRemarks] = useState<string>('');
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});

  const autoWaterfall = useMemo(() => {
    return calculateWaterfall(account, tenderedAmount);
  }, [account, tenderedAmount]);

  const activeItems = useMemo(() => {
    if (!isManualOverride) return autoWaterfall.items;
    return autoWaterfall.items.map((item) => ({
      ...item,
      allocatedAmount: manualAllocations[item.key] ?? item.allocatedAmount,
    }));
  }, [isManualOverride, autoWaterfall.items, manualAllocations]);

  const allocatedTotal = useMemo(() => {
    return activeItems.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
  }, [activeItems]);

  const centavoDelta = Math.round((tenderedAmount - allocatedTotal) * 100) / 100;
  const isBalanced = Math.abs(centavoDelta) < 0.01;

  const handleManualChange = (key: string, val: number) => {
    setManualAllocations((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const handleResetToAuto = () => {
    setIsManualOverride(false);
    setManualAllocations({});
  };

  const handleConfirm = () => {
    if (!isBalanced) return;
    onPaymentSuccess?.({ amount: tenderedAmount, orNumber: `${orSeries}-${orNumber}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary text-primary-foreground">
                  D1: Split-Pane
                </span>
                <DialogTitle className="text-base font-semibold">Post Official Payment</DialogTitle>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {account.client?.full_name} · Block {account.property.block_number} Lot{' '}
                {account.property.lot_number} ({account.property.location})
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Total Overdue / Due
              </span>
              <span className="text-sm font-mono font-bold text-foreground">
                {FORMAT_CURRENCY.format((account.penalties_due || 0) + (account.monthly_amortization || 0) * (account.installments_behind || 1))}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Work Surface */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
          {/* Left Column: Tender & Cashier Inputs (5 cols) */}
          <div className="md:col-span-5 p-6 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between space-y-4 bg-background">
            <div className="space-y-4">
              <div>
                <Label htmlFor="tendered_input" className="text-xs font-semibold">
                  Tendered Amount (₱) *
                </Label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground font-mono text-sm">
                    ₱
                  </span>
                  <Input
                    id="tendered_input"
                    type="number"
                    step="0.01"
                    min="1"
                    value={tenderedAmount || ''}
                    onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                    className="pl-7 font-mono text-base font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setTenderedAmount(account.monthly_amortization)}
                  >
                    1 Month ({FORMAT_CURRENCY.format(account.monthly_amortization)})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() =>
                      setTenderedAmount(
                        (account.penalties_due || 0) +
                          account.monthly_amortization * Math.max(1, account.installments_behind || 1)
                      )
                    }
                  >
                    Exact Overdue
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="or_series" className="text-xs">
                    OR Series
                  </Label>
                  <Input
                    id="or_series"
                    value={orSeries}
                    onChange={(e) => setOrSeries(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="or_number" className="text-xs">
                    OR Number *
                  </Label>
                  <Input
                    id="or_number"
                    value={orNumber}
                    onChange={(e) => setOrNumber(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Payment Method *</Label>
                <Select value={paymentMode} onValueChange={(val) => setPaymentMode(val as PaymentMode)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash (Physical Counter)</SelectItem>
                    <SelectItem value="Check">Check / Post-Dated Check</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer (Direct Deposit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMode === 'Check' && (
                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Bank Name</Label>
                    <Input
                      value={checkBank}
                      onChange={(e) => setCheckBank(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Check No.</Label>
                    <Input
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="remarks" className="text-xs">
                  Cashier Remarks (Optional)
                </Label>
                <Textarea
                  id="remarks"
                  placeholder="e.g. Paid in cash at Babak office, full penalty settled"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <div className="pt-2 text-[11px] text-muted-foreground border-t border-border">
              Posting Staff: <span className="font-semibold text-foreground">Cashier / Billing Staff</span>
            </div>
          </div>

          {/* Right Column: Reactive Waterfall Breakdown (7 cols) */}
          <div className="md:col-span-7 p-6 bg-muted/10 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Automatic Waterfall Cascade
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Chronological waterfall priority: Penalties &rarr; Overdue Installments &rarr; Principal
                  </p>
                </div>
                {!isManualOverride ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setIsManualOverride(true)}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Custom Override
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary gap-1"
                    onClick={handleResetToAuto}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset to Auto
                  </Button>
                )}
              </div>

              {/* Waterfall items list */}
              <div className="space-y-2 border border-border rounded-lg bg-card p-3 shadow-xs">
                {activeItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{item.label}</span>
                        {item.category === 'penalty' && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">
                            Penalty
                          </Badge>
                        )}
                        {item.category === 'overpayment_credit' && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            Advance
                          </Badge>
                        )}
                        {item.isFullyCovered && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.category !== 'overpayment_credit' ? (
                          <>Original due: {FORMAT_CURRENCY.format(item.originalDue)}</>
                        ) : (
                          <>Credited towards future billing</>
                        )}
                        {item.remainingDue > 0 && (
                          <span className="text-destructive font-semibold ml-2">
                            (₱{item.remainingDue.toFixed(2)} unpaid)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {isManualOverride ? (
                        <div className="w-28">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.allocatedAmount}
                            onChange={(e) => handleManualChange(item.key, parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs font-mono text-right"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-semibold text-sm text-foreground">
                          {FORMAT_CURRENCY.format(item.allocatedAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Balance Validation Card */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  isBalanced
                    ? 'border-border bg-card'
                    : 'border-destructive bg-destructive/10'
                }`}
              >
                <div>
                  <span className="font-medium">
                    {isBalanced ? 'Centavo Balance Reconciled' : 'Centavo Allocation Mismatch'}
                  </span>
                  <div className="text-[11px] text-muted-foreground">
                    Tendered: {FORMAT_CURRENCY.format(tenderedAmount)} · Allocated:{' '}
                    {FORMAT_CURRENCY.format(allocatedTotal)}
                  </div>
                </div>
                <div className="text-right">
                  {isBalanced ? (
                    <Badge variant="outline" className="gap-1 font-mono">
                      <Check className="h-3 w-3 text-foreground" /> Balanced
                    </Badge>
                  ) : (
                    <span className="font-mono font-bold text-destructive">
                      Delta: {FORMAT_CURRENCY.format(centavoDelta)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer inside dialog */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!isBalanced || tenderedAmount <= 0}
                onClick={handleConfirm}
                className="gap-1.5"
              >
                <Receipt className="h-4 w-4" />
                Post Receipt &amp; Allocate
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// DIRECTION D2: Guided Cashier Stepper (3-Step Modal)
// ---------------------------------------------------------------------------
export function DirectionD2({
  account,
  open,
  onOpenChange,
  onPaymentSuccess,
}: ConceptModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [tenderedAmount, setTenderedAmount] = useState<number>(15000);
  const [orNumber, setOrNumber] = useState<string>('OR-2026-9042');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [notes, setNotes] = useState<string>('');

  const waterfall = useMemo(() => {
    return calculateWaterfall(account, tenderedAmount);
  }, [account, tenderedAmount]);

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep((prev) => (prev + 1) as any);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as any);
  };

  const handleFinish = () => {
    onPaymentSuccess?.({ amount: tenderedAmount, orNumber });
    onOpenChange(false);
    setCurrentStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        {/* Header & Step Bar */}
        <div className="border-b border-border bg-muted/30 px-6 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                D2: Stepper
              </span>
              <DialogTitle className="text-base font-semibold">Payment Posting Wizard</DialogTitle>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Step {currentStep} of 3</span>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, title: 'Tender & OR' },
              { num: 2, title: 'Waterfall Review' },
              { num: 3, title: 'Print & Confirm' },
            ].map((step) => (
              <div
                key={step.num}
                className={`py-1 px-2 border-b-2 text-xs font-medium transition-all ${
                  currentStep === step.num
                    ? 'border-primary text-primary'
                    : currentStep > step.num
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-4 w-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      currentStep === step.num
                        ? 'bg-primary text-primary-foreground'
                        : currentStep > step.num
                        ? 'bg-muted text-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.num}
                  </span>
                  <span>{step.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 min-h-[340px]">
          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Tendered Cash / Check Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1 font-mono text-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Official Receipt (OR) # *</Label>
                  <Input
                    value={orNumber}
                    onChange={(e) => setOrNumber(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Payor / Transacting Person</Label>
                <Input
                  defaultValue={account.client?.full_name}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Waterfall Allocation Plan
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Verifying chronological coverage against account aging.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {FORMAT_CURRENCY.format(tenderedAmount)}
                </Badge>
              </div>

              <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/20">
                {waterfall.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-xs">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <div className="text-[11px] text-muted-foreground">
                        Required: {FORMAT_CURRENCY.format(item.originalDue)}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      {FORMAT_CURRENCY.format(item.allocatedAmount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Waterfall Credit</span>
                <span className="font-mono font-bold text-foreground">
                  {FORMAT_CURRENCY.format(waterfall.allocatedTotal)}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground">
                <FileCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Ready to Post Official Receipt</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Receipt {orNumber} for {FORMAT_CURRENCY.format(tenderedAmount)} will be appended to the permanent ledger.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10 max-w-sm mx-auto text-left text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-semibold text-foreground">{account.client?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lot:</span>
                  <span>Blk {account.property.block_number} Lot {account.property.lot_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OR #:</span>
                  <span>{orNumber}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-bold">Total Tendered:</span>
                  <span className="font-bold text-foreground">{FORMAT_CURRENCY.format(tenderedAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 3 ? (
            <Button type="button" size="sm" onClick={handleNext} className="gap-1.5">
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleFinish} className="gap-1.5">
              <Check className="h-4 w-4" />
              Confirm &amp; Post Ledger
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// DIRECTION D3: Compact Accordion with Quick Cashier Action (Single-Column)
// ---------------------------------------------------------------------------
export function DirectionD3({
  account,
  open,
  onOpenChange,
  onPaymentSuccess,
}: ConceptModalProps) {
  const [tenderedAmount, setTenderedAmount] = useState<number>(15000);
  const [orNumber, setOrNumber] = useState<string>('OR-2026-9043');
  const [showAccordion, setShowAccordion] = useState<boolean>(false);

  const waterfall = useMemo(() => {
    return calculateWaterfall(account, tenderedAmount);
  }, [account, tenderedAmount]);

  const handlePost = () => {
    onPaymentSuccess?.({ amount: tenderedAmount, orNumber });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
              D3: Compact
            </span>
            <DialogTitle className="text-base font-semibold">Quick Cashier Payment</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {account.client?.full_name} · Blk {account.property.block_number} Lot {account.property.lot_number}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Amount presets */}
          <div>
            <Label className="text-xs font-semibold">Tendered Cash Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={tenderedAmount}
              onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
              className="mt-1 font-mono text-base font-bold"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setTenderedAmount(account.monthly_amortization)}
              >
                1 Month ({FORMAT_CURRENCY.format(account.monthly_amortization)})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() =>
                  setTenderedAmount(
                    (account.penalties_due || 0) +
                      account.monthly_amortization * Math.max(1, account.installments_behind || 1)
                  )
                }
              >
                Full Overdue
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">OR Number *</Label>
              <Input
                value={orNumber}
                onChange={(e) => setOrNumber(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="text-xs h-8 font-mono"
              />
            </div>
          </div>

          {/* Quick Waterfall Summary Pill */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                Waterfall Allocation Preview
              </span>
              <button
                type="button"
                onClick={() => setShowAccordion(!showAccordion)}
                className="text-primary hover:underline flex items-center gap-1 text-[11px]"
              >
                {showAccordion ? (
                  <>
                    Hide Details <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Inspect Breakdown <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-foreground font-mono">
              &bull; Penalty: {FORMAT_CURRENCY.format(waterfall.items.find(i => i.category === 'penalty')?.allocatedAmount || 0)} <br />
              &bull; Principal Installments:{' '}
              {FORMAT_CURRENCY.format(
                waterfall.items
                  .filter(i => i.category === 'installment')
                  .reduce((sum, i) => sum + i.allocatedAmount, 0)
              )}
            </div>

            {showAccordion && (
              <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                {waterfall.items.map((item) => (
                  <div key={item.key} className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{item.label}:</span>
                    <span className="font-mono font-semibold">{FORMAT_CURRENCY.format(item.allocatedAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handlePost} className="gap-1.5">
            <Check className="h-4 w-4" />
            Post Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
