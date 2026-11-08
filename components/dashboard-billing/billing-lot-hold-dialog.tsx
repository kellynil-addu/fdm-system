'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  reopenForfeitedLotSchema,
  type ReopenForfeitedLotInput,
} from '@/lib/validations/billing';
import { reopenForfeitedLot } from '@/lib/actions/billing';
import { computeMacedaCashSurrenderValue } from '@/lib/billing/maceda';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { BillingAccountSummary } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface BillingLotHoldDialogProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BillingLotHoldDialog({
  account,
  open,
  onOpenChange,
  onSuccess,
}: BillingLotHoldDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  // Compute statutory cash surrender value (FR-064)
  const paidMonths = Math.min(
    account.terms_months || 60,
    Math.round(
      (Number(account.total_principal_paid || 0) /
        (Number(account.monthly_amortization) || 1))
    )
  );

  const maceda = computeMacedaCashSurrenderValue({
    totalInstallmentsPaid: Number(account.total_principal_paid || 0),
    installmentsPaidMonths: paidMonths,
    authorizedDeductions: Number(account.penalties_due || 0),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ReopenForfeitedLotInput>({
    resolver: zodResolver(reopenForfeitedLotSchema),
    defaultValues: {
      account_id: account.account_id,
      checklist_confirmed: true,
      remarks: '',
    },
  });

  const { execute, state } = useMutation(reopenForfeitedLot, {
    onSuccess: () => {
      toast.success('Held lot deliberately reopened and released for new contracts');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err || 'Failed to reopen held lot');
    },
  });

  const onSubmit = async (data: ReopenForfeitedLotInput) => {
    await execute(data);
  };

  const clientName = account.client?.full_name ?? 'Buyer';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Lock className="h-5 w-5" />
            Held Forfeited Lot & Reopening Clearance
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {clientName} · {lotLabel} ({account.property.location})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border border-border p-3 bg-muted/20 text-xs space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-accent-gold-foreground" />
              Statutory Cash Surrender Value (Maceda Law — FR-064)
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div>
                <span>Installments Paid:</span>
                <p className="font-mono text-foreground font-semibold">
                  {paidMonths} months ({maceda.installmentsPaidYears} yrs)
                </p>
              </div>
              <div>
                <span>Statutory Refund Rate:</span>
                <p className="font-mono text-foreground font-semibold">
                  {maceda.statutoryPercentage}%
                </p>
              </div>
              <div>
                <span>Gross Surrender Value:</span>
                <p className="font-mono text-foreground font-semibold">
                  {CURRENCY.format(maceda.grossSurrenderValue)}
                </p>
              </div>
              <div>
                <span>Net Entitled Value:</span>
                <p className="font-mono text-foreground font-bold text-success">
                  {CURRENCY.format(maceda.netSurrenderValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground">
              Deliberate Reopening Document Verification (FR-062)
            </p>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="checklist"
                checked={confirmed}
                onCheckedChange={(c) => {
                  setConfirmed(Boolean(c));
                  setValue('checklist_confirmed', Boolean(c) as true);
                }}
              />
              <Label htmlFor="checklist" className="text-xs font-normal leading-tight text-muted-foreground">
                I confirm that all notice of cancellations, demand proofs, and legal packets are complete on file. Reopening this lot releases it for new assignment while keeping the forfeited account archived (FR-063).
              </Label>
            </div>
            {errors.checklist_confirmed && (
              <p className="text-[11px] text-destructive">
                {errors.checklist_confirmed.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="remarks" className="text-xs">
              Reopening Notes & Approver Authorization
            </Label>
            <Textarea
              id="remarks"
              placeholder="State clearance reasons and supervisor authorization"
              {...register('remarks')}
              className="text-xs resize-none h-18"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!confirmed || state.status === 'pending'}
              className="gap-1.5"
            >
              {state.status === 'pending' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Confirm Reopen Lot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
