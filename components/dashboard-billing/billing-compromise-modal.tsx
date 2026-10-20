'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ShieldAlert } from 'lucide-react';
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
import { createCompromiseSchema, type CreateCompromiseInput } from '@/lib/validations/billing';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
import type { BillingAccountSummary } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

interface BillingCompromiseModalProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculatedPenalty?: number;
}

export function BillingCompromiseModal({
  account,
  open,
  onOpenChange,
  calculatedPenalty = 0,
}: BillingCompromiseModalProps) {
  const { createCompromise, isCreatingCompromise } = useBillingAccounts();

  const defaultOriginal = calculatedPenalty || Number(account.baseline_penalties_accrued || 0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateCompromiseInput>({
    resolver: zodResolver(createCompromiseSchema),
    defaultValues: {
      account_id: account.account_id,
      original_penalty: defaultOriginal,
      agreed_penalty: Math.round(defaultOriginal * 0.5),
      restructured_months: 6,
      valid_until: '',
      notes: '',
    },
  });

  const original = watch('original_penalty') || 0;
  const agreed = watch('agreed_penalty') || 0;
  const waiverSavings = Math.max(0, Number(original) - Number(agreed));

  const onSubmit = async (data: CreateCompromiseInput) => {
    await createCompromise(data);
  };

  const clientName = account.client?.full_name ?? 'Buyer';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-accent-gold-foreground" />
            Executive Compromise Agreement
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {clientName} · {lotLabel} ({account.property.location})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="original_penalty" className="text-xs">
                Option A Penalty (Contractual)
              </Label>
              <Input
                id="original_penalty"
                type="number"
                step="0.01"
                {...register('original_penalty', { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
              {errors.original_penalty && (
                <p className="text-[11px] text-destructive">{errors.original_penalty.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="agreed_penalty" className="text-xs">
                Option B Settlement (Agreed)
              </Label>
              <Input
                id="agreed_penalty"
                type="number"
                step="0.01"
                {...register('agreed_penalty', { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
              {errors.agreed_penalty && (
                <p className="text-[11px] text-destructive">{errors.agreed_penalty.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-row-hover/50 p-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Client Waiver Savings:</span>
            <span className="font-bold text-success font-mono">
              {CURRENCY.format(waiverSavings)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="restructured_months" className="text-xs">
                Restructured Term (Max 12 mos)
              </Label>
              <Input
                id="restructured_months"
                type="number"
                min="0"
                max="12"
                {...register('restructured_months', { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
              {errors.restructured_months && (
                <p className="text-[11px] text-destructive">{errors.restructured_months.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="valid_until" className="text-xs">
                Compromise Deadline
              </Label>
              <Input
                id="valid_until"
                type="date"
                {...register('valid_until')}
                className="h-9 text-xs"
              />
              {errors.valid_until && (
                <p className="text-[11px] text-destructive">{errors.valid_until.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">
              Executive Notes & Approval Reference
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. Approved per management committee meeting minutes"
              {...register('notes')}
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="quiet"
              onClick={() => onOpenChange(false)}
              disabled={isCreatingCompromise}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingCompromise} className="gap-1.5">
              {isCreatingCompromise && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Approve Compromise
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
