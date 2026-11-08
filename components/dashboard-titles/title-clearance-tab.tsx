'use client';

import { useState } from 'react';
import {
  Calendar,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
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
import { useLandTitles, lotRefLabel } from '@/lib/hooks/use-land-titles';
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

  const propertyRef = lotRefLabel(title.property);
  const clientName = title.client?.full_name ?? 'Client Account';

  return (
    <div className="space-y-4">
      {/* 30-Day Clearance Countdown Card */}
      <SectionCard className="space-y-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">30-Day Internal Clearance Window</h3>
            <Badge variant={clearance.isComplete ? 'success' : 'info'} shape="pill" dot className="text-xs">
              {clearance.isComplete ? 'Window Concluded' : `${daysRemaining}d remaining`}
            </Badge>
          </div>

          {title.status === 'Clearance Period' && canEdit && (
            <Button
              size="sm"
              disabled={isUpdatingStatus || (!clearance.isComplete && !isAdmin)}
              onClick={() => setConfirmReadyOpen(true)}
              className="text-xs gap-1.5 h-8 px-3 font-medium self-end sm:self-center"
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileCheck className="h-3.5 w-3.5" />
              )}
              {clearance.isComplete ? 'Mark Ready for Claim' : 'Early Clearance Override'}
            </Button>
          )}
        </div>

        {/* Clearance Progress Meter */}
        {title.clearance_started_at ? (
          <div>
            <StatusBar
              tone={clearance.isComplete ? 'muted' : 'slate'}
              status={clearance.isComplete ? 'Window concluded' : 'Window running'}
              progress={clearance.percentElapsed}
              detail={
                clearance.isComplete
                  ? `Concluded ${formatMediumDate(clearance.targetDate ?? new Date())}`
                  : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
              }
              trailing={`Started ${formatMediumDate(title.clearance_started_at)}`}
            />
          </div>
        ) : null}

        {/* Minimal Lot Reference Strip */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>Target Completion: <strong className="text-foreground">{clearance.targetDate ? formatMediumDate(clearance.targetDate) : '30 days from start'}</strong></span>
          <span>{propertyRef} • {title.property?.title_number ? `TCT ${title.property.title_number}` : 'TCT Pending'}</span>
        </div>
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
                ? `The 30-day internal clearance period has concluded for ${propertyRef}. This will move the title to Ready for Claim in the vault and enable client notice letters or physical turnover to ${clientName}.`
                : `The 30-day clearance period is still ongoing (${daysRemaining} days remaining). Marking this ready now will bypass the remaining clearance window and make the title ready for client release. Are you sure you want to proceed with this administrative override?`}
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
              className="bg-primary text-primary-foreground hover:opacity-90 font-medium"
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              {clearance.isComplete ? 'Confirm Ready for Claim' : 'Confirm Early Override'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
