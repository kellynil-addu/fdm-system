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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  attachPenaltyArrangementSchema,
  type AttachPenaltyArrangementInput,
} from '@/lib/validations/billing';
import { attachPenaltyArrangement } from '@/lib/actions/billing';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { BillingAccountSummary } from '@/lib/types/billing';

interface BillingPenaltyModalProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BillingPenaltyModal({
  account,
  open,
  onOpenChange,
  onSuccess,
}: BillingPenaltyModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<AttachPenaltyArrangementInput>({
    resolver: zodResolver(attachPenaltyArrangementSchema),
    defaultValues: {
      account_id: account.account_id,
      policy_id: '',
      start_date: today,
      end_date: '',
      authority: 'Bayanihan Act Moratorium',
      extends_contract_term: false,
      reason: '',
    },
  });

  const extendsTerm = watch('extends_contract_term');

  const { execute, state } = useMutation(attachPenaltyArrangement, {
    onSuccess: () => {
      toast.success('Penalty arrangement attached successfully');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err || 'Failed to attach penalty arrangement');
    },
  });

  const onSubmit = async (data: AttachPenaltyArrangementInput) => {
    await execute(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Attach Penalty Policy Arrangement</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configure custom or statutory zero-penalty windows (FR-025, FR-030)
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="authority" className="text-xs">
              Legal Authority / Reason
            </Label>
            <Input
              id="authority"
              placeholder="e.g. Bayanihan Act, Executive Amnesty"
              {...register('authority')}
              className="h-9 text-xs"
            />
            {errors.authority && (
              <p className="text-[11px] text-destructive">{errors.authority.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="start_date" className="text-xs">
                Effective Start
              </Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                className="h-9 text-xs"
              />
              {errors.start_date && (
                <p className="text-[11px] text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="end_date" className="text-xs">
                Effective End (Optional)
              </Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="extends_contract_term"
              checked={extendsTerm}
              onCheckedChange={(checked) => setValue('extends_contract_term', Boolean(checked))}
            />
            <Label htmlFor="extends_contract_term" className="text-xs font-normal">
              Also extends contract term (FR-030: separate from penalty waiver)
            </Label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason" className="text-xs">
              Justification & Approval Notes
            </Label>
            <Input
              id="reason"
              placeholder="State reason for policy application"
              {...register('reason')}
              className="h-9 text-xs"
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
            <Button type="submit" size="sm" disabled={state.status === 'pending'}>
              {state.status === 'pending' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Attach Arrangement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
