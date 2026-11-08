'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  reverseTransactionSchema,
  type ReverseTransactionInput,
} from '@/lib/validations/billing';
import { reverseTransaction } from '@/lib/actions/billing';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { BillingTransaction } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface BillingReversalModalProps {
  transaction: BillingTransaction;
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BillingReversalModal({
  transaction,
  accountId,
  open,
  onOpenChange,
  onSuccess,
}: BillingReversalModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReverseTransactionInput>({
    resolver: zodResolver(reverseTransactionSchema),
    defaultValues: {
      account_id: accountId,
      transaction_id: transaction.transaction_id,
      reason: '',
    },
  });

  const { execute, state } = useMutation(reverseTransaction, {
    onSuccess: () => {
      toast.success('Transaction reversed successfully');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err || 'Failed to reverse transaction');
    },
  });

  const onSubmit = async (data: ReverseTransactionInput) => {
    await execute(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Reverse Transaction #{transaction.transaction_sequence}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Non-destructive correction: appends an audit reversal entry without deleting historical records (FR-011, FR-012)
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border border-border p-3 bg-muted/20 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-semibold uppercase">{transaction.transaction_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Value Date:</span>
              <span className="font-mono">{transaction.value_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono font-bold text-foreground">
                {CURRENCY.format(transaction.amount)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason" className="text-xs">
              Reason for Reversal (Required for Audit Trail)
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g. Posted under incorrect receipt number, or entered against wrong lot"
              {...register('reason')}
              className="text-xs resize-none h-20"
            />
            {errors.reason && (
              <p className="text-[11px] text-destructive">{errors.reason.message}</p>
            )}
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
              variant="destructive"
              size="sm"
              disabled={state.status === 'pending'}
            >
              {state.status === 'pending' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
