'use client';

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
import { FormField } from '@/components/ui/form-field';
import { recordPdcSchema, type RecordPdcInput } from '@/lib/validations/billing';
import { recordPostDatedCheck } from '@/lib/actions/billing';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { BillingAccountSummary } from '@/lib/types/billing';

interface BillingPdcModalProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BillingPdcModal({
  account,
  open,
  onOpenChange,
  onSuccess,
}: BillingPdcModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RecordPdcInput>({
    resolver: zodResolver(recordPdcSchema),
    defaultValues: {
      account_id: account.account_id,
      check_number: '',
      bank_name: '',
      check_date: '',
      amount: account.monthly_amortization || 0,
    },
  });

  const { execute, state } = useMutation(recordPostDatedCheck, {
    onSuccess: () => {
      toast.success('Post-dated check recorded in holding');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err || 'Failed to record post-dated check');
    },
  });

  const onSubmit = async (data: RecordPdcInput) => {
    await execute(data);
  };

  const clientName = account.client?.full_name ?? 'Buyer';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Record Post-Dated Check (PDC)</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {clientName} · {lotLabel}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            id="check_number"
            label="Check Number"
            placeholder="e.g. 00012345"
            {...register('check_number')}
            error={errors.check_number?.message}
          />

          <FormField
            id="bank_name"
            label="Issuing Bank & Branch"
            placeholder="e.g. BDO - Davao Claveria"
            {...register('bank_name')}
            error={errors.bank_name?.message}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="check_date"
              label="Check Due Date"
              type="date"
              {...register('check_date')}
              error={errors.check_date?.message}
            />

            <FormField
              id="amount"
              label="Amount (₱)"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              error={errors.amount?.message}
              className="font-mono"
            />
          </div>

          <p className="text-[11px] text-muted-foreground rounded-md bg-muted/40 p-2">
            Notice: PDCs are recorded for holding and tracking only. They do not move balances or receive official receipts until cleared.
          </p>

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
              Save PDC Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
