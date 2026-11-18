'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { LoadingButton } from '@/components/ui/loading-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePropertyLots } from '@/lib/hooks/use-property-lots';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { ProjectArea } from '@/lib/types/property';
import {
  createPropertyLotSchema,
  LOT_LIMITS,
  type CreatePropertyLotFormData,
} from '@/lib/validations/property';

const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

export interface CreatePropertyLotModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  projectAreas: ProjectArea[];
  initialValues?: {
    project_area_id?: string;
    block_number?: number;
    lot_number?: number;
    area_size?: number;
    price_per_sqm?: number;
    title_number?: string;
  };
}

export function CreatePropertyLotModal({
  open,
  onOpenChange,
  projectAreas,
  initialValues,
}: CreatePropertyLotModalProps) {
  const { createLot, closeDialog } = usePropertyLots();

  function handleDismiss() {
    onOpenChange?.(false);
    closeDialog();
  }

  const projectAreaOptions = useMemo(
    () =>
      projectAreas.map((s) => ({
        value: s.project_area_id,
        label: s.name,
        description: s.description ?? undefined,
      })),
    [projectAreas]
  );

  const form = useForm<CreatePropertyLotFormData>({
    resolver: zodResolver(createPropertyLotSchema),
    defaultValues: {
      project_area_id: initialValues?.project_area_id ?? '',
      block_number: initialValues?.block_number ?? undefined,
      lot_number: initialValues?.lot_number ?? undefined,
      area_size: initialValues?.area_size ?? undefined,
      price_per_sqm: initialValues?.price_per_sqm ?? undefined,
      title_number: initialValues?.title_number ?? '',
    },
  });

  const { state, execute } = useMutation(createLot, {
    setError: form.setError,
    onSuccess: () => {
      handleDismiss();
      toast.success('Property lot created successfully');
    },
  });

  // Prefill form with the values it was opened with. `defaultValues` alone is not enough: the
  // component stays mounted across dialog transitions, so the form would otherwise keep whatever
  // the previous open left behind.
  useEffect(() => {
    if (open) {
      form.reset({
        project_area_id: initialValues?.project_area_id ?? '',
        block_number: initialValues?.block_number ?? undefined,
        lot_number: initialValues?.lot_number ?? undefined,
        area_size: initialValues?.area_size ?? undefined,
        price_per_sqm: initialValues?.price_per_sqm ?? undefined,
        title_number: initialValues?.title_number ?? '',
      });
    }
  }, [open, initialValues, form]);

  const { register, watch, formState: { errors } } = form;

  const onSubmit = form.handleSubmit((data) => {
    const projectArea = projectAreas.find((s) => s.project_area_id === data.project_area_id);
    if (!projectArea) return;
    return execute({
      project_area_id: data.project_area_id,
      location: projectArea.name,
      block_number: data.block_number,
      lot_number: data.lot_number,
      area_size: data.area_size,
      price_per_sqm: data.price_per_sqm,
      title_number: data.title_number ? data.title_number.trim() : undefined,
    });
  });

  const area = watch('area_size');
  const rate = watch('price_per_sqm');
  const total =
    Number(area) > 0 && Number(rate) > 0 && Number.isFinite(Number(area) * Number(rate))
      ? Number(area) * Number(rate)
      : null;

  const isPending = state.status === 'pending';
  const serverError = state.status === 'error' ? state.error : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleDismiss()}>
      <DialogContent className="max-w-md sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>New Property Lot</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Project area picker */}
          <div className="space-y-1.5">
            <Label htmlFor="project_area_id" className="text-sm font-medium text-foreground">
              Project Area
            </Label>
            <Controller
              name="project_area_id"
              control={form.control}
              render={({ field }) => (
                <SearchableSelect
                  id="project_area_id"
                  options={projectAreaOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending || projectAreas.length === 0}
                  placeholder={projectAreas.length === 0 ? 'No project areas available' : 'Select a project area'}
                  searchPlaceholder="Search project area name or address..."
                />
              )}
            />
            {errors.project_area_id && (
              <p className="text-xs text-destructive">{errors.project_area_id.message}</p>
            )}
          </div>

          {/* Block and Lot number inputs */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="block_number"
              label="Block No."
              type="number"
              min={1}
              max={LOT_LIMITS.blockOrLotNumber}
              step={1}
              disabled={isPending}
              error={errors.block_number?.message}
              {...register('block_number', { valueAsNumber: true })}
            />
            <FormField
              id="lot_number"
              label="Lot No."
              type="number"
              min={1}
              max={LOT_LIMITS.blockOrLotNumber}
              step={1}
              disabled={isPending}
              error={errors.lot_number?.message}
              {...register('lot_number', { valueAsNumber: true })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="area_size"
              label="Area (sqm)"
              type="number"
              min={0}
              max={LOT_LIMITS.areaSqm}
              step="0.01"
              disabled={isPending}
              error={errors.area_size?.message}
              {...register('area_size', { valueAsNumber: true })}
            />
            <FormField
              id="price_per_sqm"
              label="Price / sqm"
              type="number"
              min={0}
              max={LOT_LIMITS.pricePerSqm}
              step="0.01"
              disabled={isPending}
              error={errors.price_per_sqm?.message}
              {...register('price_per_sqm', { valueAsNumber: true })}
            />
          </div>

          <FormField
            id="title_number"
            label="Title No. (Optional)"
            type="text"
            placeholder="e.g. T-123456"
            disabled={isPending}
            error={errors.title_number?.message}
            {...register('title_number')}
          />

          <div className="flex min-w-0 w-full items-center justify-between gap-3 rounded-lg bg-row-hover px-3 py-2.5">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total contract price
            </span>
            <span
              className="min-w-0 max-w-[60%] truncate text-right text-sm font-semibold text-foreground"
              title={total === null ? undefined : PESO.format(total)}
            >
              {total === null ? 'Not set' : PESO.format(total)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            New lots start as <strong className="font-medium text-foreground">Open</strong>. If the block and
            lot match a subdivision on the project area plan, it will visually appear on the map.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleDismiss}
              disabled={isPending}
              className="border-border bg-card text-foreground hover:bg-row-hover hover:text-foreground"
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isPending}
              loadingText="Creating..."
              className="bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_85%,black)]"
            >
              Create Lot
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
