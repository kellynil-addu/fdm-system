'use client';

import { LandPlot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconBox } from '@/components/ui/icon-box';
import { PropertyCallingCard } from '@/components/dashboard-properties/property-calling-card';
import {
  BILLING_STATUS_VARIANT,
  PROPERTY_STATUS_VARIANT,
  TITLE_STATUS_VARIANT,
} from '@/lib/status-colors';
import { lotDestinationHref } from '@/lib/utils/lot-destination';
import { useClientDetail } from '@/lib/hooks/use-client-detail';
import {
  documentsForLot,
  getMissingReleaseDocuments,
  getRequiredReleaseDocuments,
} from '@/lib/utils/release-requirements';
import { getClearanceProgress } from '@/components/dashboard-titles/title-record-card';
import { formatActivityTime } from '@/lib/format-activity-time';
import type { CallingCardStatus } from '@/lib/types/calling-card';
import type { TitleStatus } from '@/lib/types/title';
import type { ClientDocument, ClientProperty } from '@/lib/types/client';
import { ClientPropertyClearance } from './client-property-clearance';

const DATE_FORMAT = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

/**
 * Derives the calling card's status bar based on which dashboard domain
 * currently owns the lot:
 * 1. Legal processing (Titled lot or Cleared by Billing awaiting intake)
 * 2. Billing ledger (Active, Delinquent, Matured, or Forfeited installment account)
 * 3. Property lot (Open, unassigned or raw subdivision lot)
 */
function getLotCallingCardStatus(
  property: ClientProperty,
  clientDocuments: ClientDocument[] = []
): CallingCardStatus {
  // 1. Legal processing
  if (property.has_title) {
    const titleStatus = (property.title_status || 'Document Preparation') as TitleStatus;
    const tone = TITLE_STATUS_VARIANT[titleStatus] ?? 'info';
    let detail: string;

    if (titleStatus === 'Clearance Period') {
      const { targetDate, daysRemaining } = getClearanceProgress(property.clearance_started_at);
      detail = targetDate
        ? `${Math.max(0, daysRemaining)} ${Math.max(0, daysRemaining) === 1 ? 'day' : 'days'} remaining`
        : property.clearance_started_at
          ? `Since ${DATE_FORMAT.format(new Date(property.clearance_started_at))}`
          : '30-day clearance window';
    } else if (
      titleStatus === 'Document Preparation' ||
      titleStatus === 'For Review' ||
      titleStatus === 'For Signature'
    ) {
      const uploaded = documentsForLot(clientDocuments, property.property_id).map(
        (d) => d.document_type
      );
      const required = getRequiredReleaseDocuments(property.is_legacy_transferred).length;
      const missing = getMissingReleaseDocuments(property.is_legacy_transferred, uploaded).length;
      const docsDone = required - missing;
      const hasTct = Boolean(property.title_number?.trim());
      const isPacketComplete = missing === 0 && hasTct;

      detail = isPacketComplete
        ? `Packet complete (${required}/${required})`
        : `${docsDone} of ${required} documents`;
    } else if (titleStatus === 'Ready for Claim') {
      detail = 'Original title in vault';
    } else if (titleStatus === 'Released') {
      detail = property.released_to_name
        ? `Released to ${property.released_to_name}`
        : property.title_updated_at
          ? `Since ${DATE_FORMAT.format(new Date(property.title_updated_at))}`
          : 'Released';
    } else {
      detail = property.title_created_at
        ? `Since ${DATE_FORMAT.format(new Date(property.title_created_at))}`
        : 'In Legal processing';
    }

    return {
      label: titleStatus,
      tone,
      detail,
    };
  }

  if (property.cleared_at) {
    return {
      label: 'Cleared by Billing',
      tone: TITLE_STATUS_VARIANT['Cleared by Billing'],
      detail: `Since ${DATE_FORMAT.format(new Date(property.cleared_at))} (${formatActivityTime(property.cleared_at)})`,
    };
  }

  // 2. Billing processing
  if (property.account_id || property.status === 'Forfeited') {
    const tcp = Number(property.total_contract_price || (property.area_size * property.price_per_sqm));
    const remaining = Number(property.remaining_balance ?? (property.account_id ? tcp : 0));
    const paid = Math.max(0, tcp - remaining);
    const percentPaid = tcp > 0 ? Math.min(100, Math.round((paid / tcp) * 100)) : 0;

    if (property.status === 'Forfeited' || property.account_status === 'Forfeited') {
      return {
        label: 'Forfeited',
        tone: BILLING_STATUS_VARIANT['Forfeited'],
        detail: 'Under 30-day grace period',
        progress: percentPaid > 0 ? percentPaid : undefined,
        trailing: remaining > 0 ? PESO.format(remaining) : undefined,
      };
    }

    let derivedStatus: 'Active' | 'Delinquent' | 'Matured' = 'Active';
    if (
      property.contract_end_date &&
      new Date(property.contract_end_date).getTime() < Date.now() &&
      remaining > 0
    ) {
      derivedStatus = 'Matured';
    } else if (Number(property.baseline_penalties_accrued) > 0) {
      derivedStatus = 'Delinquent';
    }

    return {
      label: derivedStatus,
      tone: BILLING_STATUS_VARIANT[derivedStatus] ?? 'muted',
      detail: `${percentPaid}% paid of ${PESO.format(tcp)}`,
      progress: percentPaid,
      trailing: PESO.format(remaining),
    };
  }

  // 3. Fallback: Raw / Open subdivision property lot
  const totalPrice = property.area_size * property.price_per_sqm;
  return {
    label: property.status,
    tone: PROPERTY_STATUS_VARIANT[property.status] ?? 'muted',
    detail: `${PESO.format(totalPrice)} TCP · ${PESO.format(property.price_per_sqm)}/sqm`,
  };
}

interface ClientDetailPropertiesProps {
  onOpenAssignProperty: () => void;
  /** False for inactive or archived clients, which cannot take new lots. */
  canAssign?: boolean;
}

export function ClientDetailProperties({
  onOpenAssignProperty,
  canAssign = true,
}: ClientDetailPropertiesProps) {
  const { client } = useClientDetail();
  const properties = client.properties || [];
  const assignDisabledReason = canAssign
    ? undefined
    : 'Only active clients can be assigned a lot. Reactivate this client first.';

  return (
    <div className="space-y-6">
      {/* Property List */}
      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-row-hover py-12">
          <IconBox size="lg">
            <LandPlot className="h-6 w-6" />
          </IconBox>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No properties assigned</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {assignDisabledReason ?? 'Click below to assign a property lot to this client.'}
            </p>
          </div>
          <Button
            variant="quiet"
            size="sm"
            onClick={onOpenAssignProperty}
            disabled={!canAssign}
            title={assignDisabledReason}
            className="mt-2 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Assign new property
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Assigned Properties</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {properties.map((property) => {
              return (
                <div key={property.property_id} className="flex flex-col gap-2">
                  <PropertyCallingCard
                    property={property}
                    href={lotDestinationHref(property, client.client_id)}
                    status={getLotCallingCardStatus(property, client.client_document)}
                  />

                  {(property.account_id || property.has_title) && (
                    <ClientPropertyClearance property={property} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 pt-2">
            <Button
              variant="quiet"
              size="sm"
              onClick={onOpenAssignProperty}
              disabled={!canAssign}
              title={assignDisabledReason}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign new property
            </Button>
            {assignDisabledReason && (
              <p className="text-xs text-muted-foreground">{assignDisabledReason}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
