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
import { getArchiveEligibility } from '@/lib/utils/archive-rules';
import type { ProjectArea, ProjectAreaWithLots } from '@/lib/types/property';

export function DeleteProjectAreaDialog({
  projectArea,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  projectArea: ProjectArea | ProjectAreaWithLots;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isPending: boolean;
}) {
  const isArchived = Boolean(projectArea.is_archived);
  const eligibility = getArchiveEligibility(isArchived, projectArea.archived_at);

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project Area</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete <strong>{projectArea.name}</strong>?
            This action cannot be undone and will permanently remove this project area and its subdivision plat plans.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!eligibility.isEligibleForDelete && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-[color-mix(in_srgb,var(--destructive)_10%,white)] p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{eligibility.tooltipReason}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            disabled={isPending || !eligibility.isEligibleForDelete}
            className="bg-destructive text-destructive-foreground hover:bg-[color-mix(in_srgb,var(--destructive)_90%,black)]"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Project Area
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
