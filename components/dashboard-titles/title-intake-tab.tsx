'use client';

import { useState } from 'react';
import { ArrowRight, Inbox, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { SectionCard, SectionHeader } from '@/components/ui/section-card';
import { useLandTitles, lotRefLabel, type TitleDialogItem } from '@/lib/hooks/use-land-titles';
import { useMutation } from '@/lib/hooks/use-mutation';
import { formatMediumDate } from '@/lib/format-date';
import type { LandTitle } from '@/lib/types/title';

interface TitleIntakeTabProps {
  item: TitleDialogItem;
  onStartedProcessing?: (title: LandTitle) => void;
}

export function TitleIntakeTab({ item, onStartedProcessing }: TitleIntakeTabProps) {
  const { createTitle, revertClearance, canCreate, canEdit } = useLandTitles();
  const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);

  const activeTitle = item.type === 'title' ? item.data : null;
  const activeAwaiting = item.type === 'awaiting' ? item.data : null;

  const clientName = activeTitle?.client?.full_name ?? activeAwaiting?.client?.full_name ?? 'Client Account';
  const propertyRef = lotRefLabel(activeTitle?.property ?? activeAwaiting?.property);

  const { state: startState, execute: runStart } = useMutation(createTitle, {
    onSuccess: (created) => {
      toast.success(`Legal processing started for ${propertyRef}`);
      onStartedProcessing?.(created);
    },
  });

  const { state: returnState, execute: runReturn } = useMutation(revertClearance, {
    onSuccess: () => {
      toast.success(`Account for ${propertyRef} returned to Billing`);
      setConfirmReturnOpen(false);
    },
  });

  const isStarting = startState.status === 'pending';
  const isReturning = returnState.status === 'pending';

  const property = activeTitle?.property ?? activeAwaiting?.property;
  const client = activeTitle?.client ?? activeAwaiting?.client;
  const primaryContact = client?.contact_info?.find((c) => c.is_primary) ?? client?.contact_info?.[0];

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <Inbox className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Billing cleared this account as fully paid
          {activeAwaiting?.cleared_at ? (
            <>
              {' '}on{' '}
              <span className="font-semibold text-foreground">
                {formatMediumDate(activeAwaiting.cleared_at)}
              </span>
            </>
          ) : null}
          . {activeAwaiting ? 'Accept this account to start document preparation, or return it to billing if there is a discrepancy.' : 'Account intake completed.'}
        </AlertDescription>
      </Alert>

      <SectionCard className="space-y-3">
        <SectionHeader title="Account Intake Overview" />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Principal Buyer:</span>
            <p className="font-medium text-foreground">{clientName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Co-Buyers:</span>
            <p className="font-medium text-foreground">
              {activeAwaiting && activeAwaiting.co_buyers.length > 0
                ? activeAwaiting.co_buyers.join(', ')
                : 'None'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Property Lot:</span>
            <p className="font-medium text-foreground">{propertyRef}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Title Number on Lot:</span>
            <p className="font-mono text-foreground">
              {property?.title_number ?? 'Not yet recorded'}
            </p>
          </div>
          {/*
            Lot size and price are on the property record and were never shown
            here, though intake staff check them against the account before
            accepting it. Contact and address were loaded for the calling cards
            and unused on this page, which is the page whose whole job is
            chasing the buyer for requirements.
          */}
          {property?.area_size ? (
            <div>
              <span className="text-muted-foreground">Lot Area:</span>
              <p className="font-medium text-foreground">
                {property.area_size.toLocaleString('en-PH')} sqm
              </p>
            </div>
          ) : null}
          {activeTitle?.property?.price_per_sqm ? (
            <div>
              <span className="text-muted-foreground">Price per sqm:</span>
              <p className="font-medium text-foreground">
                ₱{activeTitle.property.price_per_sqm.toLocaleString('en-PH')}
              </p>
            </div>
          ) : null}
          {primaryContact ? (
            <div>
              <span className="text-muted-foreground">
                {primaryContact.type === 'Email' ? 'Email:' : 'Contact:'}
              </span>
              <p className="font-medium text-foreground">{primaryContact.value}</p>
            </div>
          ) : null}
          {client?.address ? (
            <div className="col-span-2">
              <span className="text-muted-foreground">Buyer Address:</span>
              <p className="font-medium text-foreground">{client.address}</p>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {activeAwaiting && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          {canEdit && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isReturning || isStarting}
              onClick={() => setConfirmReturnOpen(true)}
              className="text-sm h-9 px-4 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Send back to Billing
            </Button>
          )}
          {canCreate && (
            <Button
              type="button"
              size="sm"
              className="gap-2 ml-auto text-sm h-9 px-4"
              disabled={isStarting || isReturning}
              onClick={() => void runStart(activeAwaiting.property.property_id)}
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Start Legal Processing
            </Button>
          )}
        </div>
      )}

      {/* Confirmation Alert to Return Account to Billing */}
      <AlertDialog open={confirmReturnOpen} onOpenChange={setConfirmReturnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return account to Billing?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will remove this account from Legal intake and return it to Billing as uncleared.
              Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReturning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isReturning}
              onClick={(e) => {
                e.preventDefault();
                if (activeAwaiting) void runReturn(activeAwaiting.account_id);
              }}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              {isReturning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Confirm Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
