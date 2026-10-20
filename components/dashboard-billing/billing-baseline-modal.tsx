'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { History, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { setBaselineCutoffSchema, type SetBaselineCutoffInput } from '@/lib/validations/billing';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
import type { BillingAccountSummary } from '@/lib/types/billing';

interface BillingBaselineModalProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingBaselineModal({
  account,
  open,
  onOpenChange,
}: BillingBaselineModalProps) {
  const { setBaseline, isSettingBaseline } = useBillingAccounts();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetBaselineCutoffInput>({
    resolver: zodResolver(setBaselineCutoffSchema),
    defaultValues: {
      account_id: account.account_id,
      baseline_date: account.baseline_date || '2026-01-01',
      baseline_principal_paid: Number(account.baseline_principal_paid || 0),
      baseline_penalties_accrued: Number(account.baseline_penalties_accrued || 0),
      baseline_notes: account.baseline_notes || '',
    },
  });

  const onSubmit = async (data: SetBaselineCutoffInput) => {
    await setBaseline(data);
  };

  const clientName = account.client?.full_name ?? 'Buyer';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Legacy Cut-Off Baseline Snapshot
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {clientName} · {lotLabel} ({account.property.location})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="baseline_date" className="text-xs">
              Audited Cut-Off Date
            </Label>
            <Input
              id="baseline_date"
              type="date"
              {...register('baseline_date')}
              className="h-9 text-xs"
            />
            {errors.baseline_date && (
              <p className="text-[11px] text-destructive">{errors.baseline_date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="baseline_principal_paid" className="text-xs">
                Historical Principal Paid
              </Label>
              <Input
                id="baseline_principal_paid"
                type="number"
                step="0.01"
                {...register('baseline_principal_paid', { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
              {errors.baseline_principal_paid && (
                <p className="text-[11px] text-destructive">
                  {errors.baseline_principal_paid.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="baseline_penalties_accrued" className="text-xs">
                Accrued Penalties at Cut-off
              </Label>
              <Input
                id="baseline_penalties_accrued"
                type="number"
                step="0.01"
                {...register('baseline_penalties_accrued', { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
              {errors.baseline_penalties_accrued && (
                <p className="text-[11px] text-destructive">
                  {errors.baseline_penalties_accrued.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="baseline_notes" className="text-xs">
              Audit Notes / Migration Reference
            </Label>
            <Textarea
              id="baseline_notes"
              placeholder="e.g. Verified against 2025 audited QuickBooks balance sheet and ledger card"
              {...register('baseline_notes')}
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="quiet"
              onClick={() => onOpenChange(false)}
              disabled={isSettingBaseline}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSettingBaseline} className="gap-1.5">
              {isSettingBaseline && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Baseline
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
