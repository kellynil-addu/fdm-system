'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
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
  resolveDiscrepancySchema,
  type ResolveDiscrepancyInput,
} from '@/lib/validations/billing';
import { resolveDiscrepancy } from '@/lib/actions/billing';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { BillingImportDiscrepancy } from '@/lib/types/billing';

interface BillingDiscrepancyModalProps {
  discrepancy: BillingImportDiscrepancy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BillingDiscrepancyModal({
  discrepancy,
  open,
  onOpenChange,
  onSuccess,
}: BillingDiscrepancyModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ResolveDiscrepancyInput>({
    resolver: zodResolver(resolveDiscrepancySchema),
    defaultValues: {
      discrepancy_id: discrepancy.discrepancy_id,
      status: 'resolved',
      resolution_notes: '',
    },
  });

  const { execute, state } = useMutation(resolveDiscrepancy, {
    onSuccess: () => {
      toast.success('Discrepancy resolved and cleared from review queue');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err || 'Failed to resolve discrepancy');
    },
  });

  const onSubmit = async (data: ResolveDiscrepancyInput) => {
    await execute(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Resolve Statement Discrepancy
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Source: {discrepancy.source_filename} ({discrepancy.sheet_name ?? 'Sheet1'})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border border-border p-3 bg-muted/20 text-xs space-y-1.5">
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Discrepancy Type:</span>
              <span className="capitalize text-destructive">
                {discrepancy.discrepancy_type.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-muted-foreground font-mono text-[11px] bg-background/50 p-2 rounded border border-border">
              {JSON.stringify(discrepancy.details, null, 2)}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="resolution_notes" className="text-xs">
              Resolution Audit Notes (Who cleared it and what was changed per FR-058)
            </Label>
            <Textarea
              id="resolution_notes"
              placeholder="e.g. Recomputed from official receipts; sheet formula error verified against manual ledger book"
              {...register('resolution_notes')}
              className="text-xs resize-none h-20"
            />
            {errors.resolution_notes && (
              <p className="text-[11px] text-destructive">
                {errors.resolution_notes.message}
              </p>
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
              size="sm"
              disabled={state.status === 'pending'}
              className="gap-1.5"
            >
              {state.status === 'pending' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Clear Review Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
