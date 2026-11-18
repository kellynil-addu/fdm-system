'use client';

import { useState } from 'react';
import {
  ArrowRight,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
  const property = activeTitle?.property ?? activeAwaiting?.property;
  const client = activeTitle?.client ?? activeAwaiting?.client;
  const propertyRef = lotRefLabel(property);
  const propertyLocation = property?.location ?? 'Property Location';

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

  const primaryContact = client?.contact_info?.find((c) => c.is_primary) ?? client?.contact_info?.[0];
  const coBuyers = activeAwaiting?.co_buyers ?? [];

  return (
    <div className="space-y-4">
      {/* Top Clearance Status & Action Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="success" shape="pill" dot>
            {activeAwaiting ? 'Cleared by Billing' : 'In Legal Processing'}
          </Badge>
          {activeAwaiting?.cleared_at && (
            <span className="text-xs text-muted-foreground">
              Cleared on <span className="font-medium text-foreground">{formatMediumDate(activeAwaiting.cleared_at)}</span>
            </span>
          )}
        </div>

        {activeAwaiting && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {canEdit && (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                disabled={isReturning || isStarting}
                onClick={() => setConfirmReturnOpen(true)}
                className="text-xs h-8 px-3 gap-1.5 text-destructive hover:bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Return to Billing
              </Button>
            )}
            {canCreate && (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs h-8 px-3 font-medium"
                disabled={isStarting || isReturning}
                onClick={() => void runStart(activeAwaiting.property.property_id)}
              >
                {isStarting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Start Legal Processing
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Unified 2-Column Spec Sheet */}
      <SectionCard className="space-y-4">
        <SectionHeader title="Account & Lot Specifications" />
        <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {/* Column 1: Buyer Details */}
          <div className="space-y-3.5 sm:pr-4">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Buyer Information
            </h5>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Principal Buyer
              </span>
              <p className="font-semibold text-foreground text-sm">{clientName}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Co-Buyers / Heirs
              </span>
              <p className="text-foreground text-sm">
                {coBuyers.length > 0 ? (
                  <span className="font-medium">{coBuyers.join(', ')}</span>
                ) : (
                  <span className="text-muted-foreground italic text-xs">None registered</span>
                )}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                {primaryContact?.type === 'Email' ? (
                  <Mail className="h-3.5 w-3.5" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )}
                Contact Channel
              </span>
              <p className="text-foreground text-sm">
                {primaryContact?.value ? (
                  <span className="font-mono text-sm">{primaryContact.value}</span>
                ) : (
                  <span className="text-warning italic text-xs font-medium">No contact on file</span>
                )}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Mailing Address
              </span>
              <p className="text-foreground text-sm">
                {client?.address ? (
                  <span>{client.address}</span>
                ) : (
                  <span className="text-muted-foreground italic text-xs">No address recorded</span>
                )}
              </p>
            </div>
          </div>

          {/* Column 2: Property Parcel Details */}
          <div className="space-y-3.5 pt-4 sm:pt-0 sm:pl-4">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Property Specifications
            </h5>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Property Lot</span>
              <p className="font-semibold text-foreground text-sm">{propertyRef}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Subdivision / Area</span>
              <p className="font-medium text-foreground text-sm">{propertyLocation}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Title Number on Lot
              </span>
              <p className="text-sm">
                {property?.title_number ? (
                  <span className="font-mono font-semibold text-foreground">{property.title_number}</span>
                ) : (
                  <span className="text-warning text-xs font-medium">Not yet recorded</span>
                )}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Lot Area Size</span>
              <p className="font-medium text-foreground text-sm">
                {property?.area_size ? `${property.area_size.toLocaleString('en-PH')} sqm` : 'N/A'}
                {activeTitle?.property?.price_per_sqm ? (
                  <span className="text-muted-foreground text-xs ml-2">
                    (₱{activeTitle.property.price_per_sqm.toLocaleString('en-PH')}/sqm)
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Confirmation Alert to Return Account to Billing */}
      <AlertDialog open={confirmReturnOpen} onOpenChange={setConfirmReturnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return account to Billing?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will remove this account from Legal intake and return it to Billing as uncleared.
              Are you sure there is a discrepancy with this account?
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
