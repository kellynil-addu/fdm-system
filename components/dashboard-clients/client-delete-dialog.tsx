'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useClients } from '@/lib/hooks/use-clients-page';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import { getArchiveEligibility } from '@/lib/utils/archive-rules';
import type { ClientListItem } from '@/lib/types/client';

export function DeleteClientDialog({
  client,
  open,
}: {
  client: ClientListItem;
  open: boolean;
}) {
  const { deleteClient, closeDialog } = useClients();
  const isArchived = client.status === 'Archived' || Boolean(client.is_archived);
  const eligibility = getArchiveEligibility(isArchived, client.archived_at);

  const { state, execute } = useMutation(deleteClient, {
    onSuccess: () => {
      closeDialog();
      toast.success('Client deleted successfully');
    },
  });

  const isPending = state.status === 'pending';

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && closeDialog()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{client.full_name}</strong>? 
            This action cannot be undone and will remove all associated contact information and 
            activity records.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!eligibility.isEligibleForDelete && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-[color-mix(in_srgb,var(--destructive)_10%,white)] p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{eligibility.tooltipReason}</span>
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void execute(client.client_id);
            }}
            disabled={isPending || !eligibility.isEligibleForDelete}
            className="bg-destructive text-destructive-foreground hover:bg-[color-mix(in_srgb,var(--destructive)_90%,black)]"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete client
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

