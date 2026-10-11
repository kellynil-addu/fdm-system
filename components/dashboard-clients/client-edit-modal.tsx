'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { LoadingButton } from '@/components/ui/loading-button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useClients } from '@/lib/hooks/use-clients-page';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { ClientListItem } from '@/lib/types/client';
import { CIVIL_STATUSES, GENDERS, type CivilStatus, type Gender } from '@/lib/types/client';
import { clientSchema, type ClientFormData } from '@/lib/validations/client';

export function EditClientModal({
  client,
  open,
}: {
  client: ClientListItem;
  open: boolean;
}) {
  const { updateClient, closeDialog } = useClients();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: client.full_name,
      address: client.address ?? '',
      tin_number: client.tin_number ?? '',
      civil_status: client.civil_status ?? null,
      spouse_name: client.spouse_name ?? '',
      gender: client.gender ?? null,
      status: client.status === 'Inactive' ? 'Inactive' : 'Active',
    },
  });

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = form;
  const currentCivilStatus = watch('civil_status');

  const { state, execute } = useMutation(updateClient, {
    setError: form.setError,
    onSuccess: () => {
      closeDialog();
      toast.success('Client updated successfully');
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        full_name: client.full_name,
        address: client.address ?? '',
        tin_number: client.tin_number ?? '',
        civil_status: client.civil_status ?? null,
        spouse_name: client.spouse_name ?? '',
        gender: client.gender ?? null,
        status: client.status === 'Inactive' ? 'Inactive' : 'Active',
      });
    }
  }, [open, client, reset]);

  const onSubmit = handleSubmit(async (data) => {
    await execute(client.client_id, {
      full_name: data.full_name,
      address: data.address?.trim() || null,
      tin_number: data.tin_number?.trim() || null,
      civil_status: data.civil_status || null,
      spouse_name: data.civil_status === 'Married' ? data.spouse_name?.trim() || null : null,
      gender: data.gender || null,
      status: data.status,
    });
  });

  const isPending = state.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <FormField
            id="edit-client-name"
            label="Full name"
            placeholder="Juan dela Cruz"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <FormField
            id="edit-client-address"
            label="Address"
            placeholder="Davao City, Philippines"
            error={errors.address?.message}
            {...register('address')}
          />

          <FormField
            id="edit-client-tin"
            label="TIN number"
            placeholder="123-456-789"
            hint="Format: XXX-XXX-XXX (9 digits)"
            error={errors.tin_number?.message}
            {...register('tin_number')}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-client-civil-status" className="text-sm font-medium text-foreground">
                Civil status
              </Label>
              <Controller
                control={control}
                name="civil_status"
                render={({ field }) => (
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(val) => field.onChange(val as CivilStatus)}
                  >
                    <SelectTrigger id="edit-client-civil-status" className="w-full">
                      <SelectValue placeholder="Select civil status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CIVIL_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.civil_status && (
                <p className="text-[11px] text-destructive">{errors.civil_status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-gender" className="text-sm font-medium text-foreground">
                Gender
              </Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(val) => field.onChange(val as Gender)}
                  >
                    <SelectTrigger id="edit-client-gender" className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && (
                <p className="text-[11px] text-destructive">{errors.gender.message}</p>
              )}
            </div>
          </div>

          {currentCivilStatus === 'Married' && (
            <FormField
              id="edit-client-spouse"
              label="Spouse name"
              placeholder="Maria Santos"
              hint="Required for married clients"
              error={errors.spouse_name?.message}
              {...register('spouse_name')}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-client-status" className="text-sm font-medium text-foreground">
              Status
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-client-status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isPending}
            >
              Cancel
            </Button>
            <LoadingButton type="submit" isLoading={isPending} loadingText="Saving...">
              Save changes
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
