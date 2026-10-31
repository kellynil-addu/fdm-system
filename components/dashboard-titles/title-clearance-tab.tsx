'use client';

import { useState } from 'react';
import { FileCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard, SectionHeader } from '@/components/ui/section-card';
import { StatusBar } from '@/components/ui/status-bar';
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
import { useLandTitles } from '@/lib/hooks/use-land-titles';
import { formatMediumDate } from '@/lib/format-date';
import { getClearanceProgress } from '@/lib/title-progress';
import type { LandTitle, TitleStatus } from '@/lib/types/title';

interface TitleClearanceTabProps {
  title: LandTitle;
  onStatusChange: (status: TitleStatus) => void;
  isUpdatingStatus: boolean;
}

export function TitleClearanceTab({
  title,
  onStatusChange,
  isUpdatingStatus,
}: TitleClearanceTabProps) {
  const { canEdit, isAdmin } = useLandTitles();
  const [confirmReadyOpen, setConfirmReadyOpen] = useState(false);

  const clearance = getClearanceProgress(title.clearance_started_at);

  const daysRemaining = Math.max(0, clearance.daysRemaining);

  return (
    <div className="space-y-6">
      <SectionCard className="space-y-4">
        <SectionHeader
          title="30-Day Clearance Period"
          description={
            clearance.isComplete
              ? 'Clearance window has ended. Title is eligible to be marked ready for claim.'
              : clearance.targetDate
                ? `Clears on ${formatMediumDate(clearance.targetDate)}`
                : 'Clearance period active'
          }
          action={
            title.status === 'Clearance Period' && canEdit ? (
              <Button
                size="sm"
                disabled={isUpdatingStatus || (!clearance.isComplete && !isAdmin)}
                onClick={() => setConfirmReadyOpen(true)}
                className="text-sm gap-2 h-9 px-4 shrink-0"
              >
                <FileCheck className="h-4 w-4" />
                Mark Ready for Claim
              </Button>
            ) : undefined
          }
        />

        {/*
          The window was previously a sentence — "Clears on X (N days remaining)"
          — which is a fact you have to read and convert. A meter answers the
          same question at a glance, and it is the same `StatusBar` the record
          cards use, so the dialog and the card behind it agree.
        */}
        {title.clearance_started_at ? (
          <StatusBar
            tone={clearance.isComplete ? 'muted' : 'slate'}
            status={clearance.isComplete ? 'Window closed' : 'Window running'}
            progress={clearance.percentElapsed}
            detail={
              clearance.isComplete
                ? `Closed ${formatMediumDate(clearance.targetDate ?? new Date())}`
                : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
            }
            trailing={`Started ${formatMediumDate(title.clearance_started_at)}`}
          />
        ) : null}
      </SectionCard>

      {/* Confirmation Alert to Mark Ready for Claim */}
      <AlertDialog open={confirmReadyOpen} onOpenChange={setConfirmReadyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearance.isComplete
                ? 'Mark Title Ready for Claim?'
                : 'Mark Ready for Claim (Early Clearance)?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {clearance.isComplete
                ? 'The 30-day internal clearance period has concluded. This will move the title to Ready for Claim in the vault and enable client notice letters or turnover to the buyer.'
                : `The 30-day clearance period is still ongoing (${daysRemaining} days remaining). Marking this ready now will bypass the remaining clearance window and make the title ready for client release. Are you sure you want to proceed?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdatingStatus}
              onClick={() => {
                setConfirmReadyOpen(false);
                onStatusChange('Ready for Claim');
              }}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
