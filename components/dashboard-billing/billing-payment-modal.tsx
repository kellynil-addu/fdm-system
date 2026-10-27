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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordPaymentSchema, type RecordPaymentInput } from '@/lib/validations/billing';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
import type { BillingAccountSummary, PaymentMode } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

interface BillingPaymentModalProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingPaymentModal({
  account,
  open,
  onOpenChange,
}: BillingPaymentModalProps) {
  const { recordPayment, isRecordingPayment } = useBillingAccounts();

  const today = new Date().toISOString().split('T')[0];

  const defaultPrincipal = useMemo(() => {
    return Math.min(
      Number(account.remaining_balance || 0),
      Number(account.monthly_amortization || 0)
    );
  }, [account]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      account_id: account.account_id,
      or_number: '',
      payment_date: today,
      payment_mode: 'Cash',
      principal_amount: defaultPrincipal,
      penalty_amount: 0,
      storage_fee_amount: 0,
      titling_fee_amount: 0,
      remarks: '',
    },
  });

  const principal = watch('principal_amount') || 0;
  const penalty = watch('penalty_amount') || 0;
  const titling = watch('titling_fee_amount') || 0;
  const storage = watch('storage_fee_amount') || 0;
  const total = Number(principal) + Number(penalty) + Number(titling) + Number(storage);

  const onSubmit = async (data: RecordPaymentInput) => {
    await recordPayment(data);
  };

  const clientName = account.client?.full_name ?? 'Buyer';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {clientName} · {lotLabel} ({account.property.location})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="or_number" className="text-xs">
                Receipt / OR Number
              </Label>
              <Input
                id="or_number"
                placeholder="e.g. OR#38578"
                {...register('or_number')}
                className="h-9 text-xs"
              />
              {errors.or_number && (
                <p className="text-[11px] text-destructive">{errors.or_number.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="payment_date" className="text-xs">
                Payment Date
              </Label>
              <Input
                id="payment_date"
                type="date"
                {...register('payment_date')}
                className="h-9 text-xs"
              />
              {errors.payment_date && (
                <p className="text-[11px] text-destructive">{errors.payment_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="payment_mode" className="text-xs">
              Payment Mode
            </Label>
            <Select
              defaultValue="Cash"
              onValueChange={(val) => setValue('payment_mode', val as PaymentMode)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Online Deposit">Online Deposit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3 bg-row-hover/50">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Itemized Allocation
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="principal_amount" className="text-xs">
                  Principal (TSP)
                </Label>
                <Input
                  id="principal_amount"
                  type="number"
                  step="0.01"
                  {...register('principal_amount', { valueAsNumber: true })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="penalty_amount" className="text-xs">
                  Overdue Penalty
                </Label>
                <Input
                  id="penalty_amount"
                  type="number"
                  step="0.01"
                  {...register('penalty_amount', { valueAsNumber: true })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="titling_fee_amount" className="text-xs">
                  Titling Fee
                </Label>
                <Input
                  id="titling_fee_amount"
                  type="number"
                  step="0.01"
                  {...register('titling_fee_amount', { valueAsNumber: true })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="storage_fee_amount" className="text-xs">
                  Storage Fee
                </Label>
                <Input
                  id="storage_fee_amount"
                  type="number"
                  step="0.01"
                  {...register('storage_fee_amount', { valueAsNumber: true })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
              <span className="font-semibold text-foreground">Total Tendered:</span>
              <span className="font-bold text-sm text-primary font-mono">
                {CURRENCY.format(total)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="remarks" className="text-xs">
              Remarks (Optional)
            </Label>
            <Textarea
              id="remarks"
              placeholder="e.g. Deposit slip reference or teller notes"
              {...register('remarks')}
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="quiet"
              onClick={() => onOpenChange(false)}
              disabled={isRecordingPayment}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isRecordingPayment} className="gap-1.5">
              {isRecordingPayment && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
