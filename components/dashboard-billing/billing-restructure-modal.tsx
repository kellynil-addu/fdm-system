'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import {
  restructureAccountSchema,
  type RestructureAccountInput,
} from '@/lib/validations/billing';
import { restructureAccount } from '@/lib/actions/billing';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { BillingAccountSummary } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface BillingRestructureModalProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BillingRestructureModal({
  account,
  open,
  onOpenChange,
  onSuccess,
}: BillingRestructureModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const remainingPrincipal = account.outstanding_principal ?? account.remaining_balance ?? 0;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<RestructureAccountInput>({
    resolver: zodResolver(restructureAccountSchema),
    defaultValues: {
      account_id: account.account_id,
      effective_date: today,
      term_months: 12,
      amortization_day: account.amortization_day || 28,
      reason: '',
    },
  });

  const termMonths = watch('term_months') || 12;
  const newMonthlyDue = useMemo(() => {
    return termMonths > 0 ? remainingPrincipal / termMonths : 0;
  }, [remainingPrincipal, termMonths]);

  const { execute, state } = useMutation(restructureAccount, {
    onSuccess: () => {
      toast.success('Contract restructured with new schedule');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err || 'Failed to restructure contract');
    },
  });

  const onSubmit = async (data: RestructureAccountInput) => {
    await execute(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Restructure Account Schedule</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Re-spread remaining principal (FR-040: capped at 12 months, penalties settled separately)
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Card variant="default" padding="sm" className="grid grid-cols-2 gap-3 text-xs bg-muted/20">
            <div>
              <p className="text-muted-foreground">Original Terms:</p>
              <p className="font-semibold">{account.terms_months} months</p>
              <p className="text-muted-foreground mt-1">Original Monthly:</p>
              <p className="font-mono font-semibold">{CURRENCY.format(account.monthly_amortization)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Principal to Re-spread:</p>
              <p className="font-mono font-bold text-foreground">{CURRENCY.format(remainingPrincipal)}</p>
              <p className="text-muted-foreground mt-1">New Monthly Amort:</p>
              <p className="font-mono font-bold text-success">{CURRENCY.format(newMonthlyDue)}</p>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="effective_date"
              label="Effective Start Date"
              type="date"
              error={errors.effective_date?.message}
              labelClassName="text-xs"
              className="h-9 text-xs"
              {...register('effective_date')}
            />

            <FormField
              id="term_months"
              label="New Term (Max 12 Months)"
              type="number"
              min="1"
              max="12"
              error={errors.term_months?.message}
              labelClassName="text-xs"
              className="h-9 text-xs font-mono"
              {...register('term_months', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason" className="text-xs">
              Reason / Justification
            </Label>
            <Textarea
              id="reason"
              placeholder="State reason for approved restructuring compromise"
              {...register('reason')}
              className="text-xs resize-none h-18"
            />
            {errors.reason && (
              <p className="text-[11px] text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={state.status === 'pending'}>
              {state.status === 'pending' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Restructured Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
