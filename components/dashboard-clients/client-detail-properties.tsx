'use client';

import { LandPlot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconBox } from '@/components/ui/icon-box';
import { PropertyCallingCard } from '@/components/dashboard-properties/property-calling-card';
import { PROPERTY_STATUS_VARIANT } from '@/lib/status-colors';
import { lotDestinationHref } from '@/lib/utils/lot-destination';
import { useClientDetail } from '@/lib/hooks/use-client-detail';
import { ClientPropertyClearance } from './client-property-clearance';

const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

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
              const totalPrice = property.area_size * property.price_per_sqm;

              return (
                <div key={property.property_id} className="flex flex-col gap-2">
                  {/*
                    The card carries the lot, its project area, its area and its
                    TCT. Where it links depends on the lot's stage, not on the
                    grid it happens to be rendered in — see `lotDestinationHref`
                    for why. The money is the one number the field list has no
                    room for, so it goes in the bar beside the status: a buyer's
                    first question about a lot is what it costs and how far
                    along the payments are.
                  */}
                  <PropertyCallingCard
                    property={property}
                    href={lotDestinationHref(property, client.client_id)}
                    status={{
                      label: property.status,
                      tone: PROPERTY_STATUS_VARIANT[property.status] ?? 'muted',
                      detail: `${PESO.format(totalPrice)} TCP · ${PESO.format(property.price_per_sqm)}/sqm`,
                    }}
                  />

                  {/*
                    Deliberately outside the card, not tucked under the bar.
                    This is not a fact about the lot — it is the set of things
                    staff can *do* to it (clear it, forfeit it, undo a
                    clearance), and a bar that ends with buttons stops being a
                    status strip.
                  */}
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
