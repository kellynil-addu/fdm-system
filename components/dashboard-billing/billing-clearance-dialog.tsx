'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Undo2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
import type { BillingAccountSummary } from '@/lib/types/billing';

interface BillingClearanceDialogProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingClearanceDialog({
  account,
  open,
  onOpenChange,
}: BillingClearanceDialogProps) {
  const { attestClearance, undoClearance, isAttestingClearance, isUndoingClearance } =
    useBillingAccounts();
  const [remarks, setRemarks] = useState('');

  const isCleared = Boolean(account.cleared_at);
  const clientName = account.client?.full_name ?? 'Buyer';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;

  const handleConfirm = async () => {
    if (isCleared) {
      await undoClearance(account.account_id);
    } else {
      await attestClearance(account.account_id, remarks.trim() || null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCleared ? (
              <>
                <Undo2 className="h-5 w-5 text-warning" />
                Undo Billing Clearance
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                Attest Billing Clearance
              </>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {clientName} · {lotLabel} ({account.property.location})
          </p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {isCleared ? (
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground bg-row-hover/50 space-y-1.5">
              <p className="font-semibold text-foreground">
                Revert account to uncleared state?
              </p>
              <p>
                This will reset clearance and restore the lot status to Reserved. This is only permitted before Legal begins processing the land title.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground bg-row-hover/50 space-y-1.5">
              <p className="font-semibold text-foreground">
                Attest that the client has settled financial obligations:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Advances the property lot status to <strong>Sold</strong>.</li>
                <li>Releases the account directly into Legal&apos;s title turnover queue.</li>
                <li>Logs your staff account as the official clearance certifier.</li>
              </ul>
            </div>
          )}

          {!isCleared && (
            <div className="space-y-1">
              <Label htmlFor="clearance-remarks" className="text-xs">
                Verification Remarks (Optional)
              </Label>
              <Textarea
                id="clearance-remarks"
                placeholder="e.g. Physical receipts verified against QuickBooks ledger and bank deposits"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="quiet"
            onClick={() => onOpenChange(false)}
            disabled={isAttestingClearance || isUndoingClearance}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isCleared ? 'outline' : 'default'}
            onClick={handleConfirm}
            disabled={isAttestingClearance || isUndoingClearance}
            className="gap-1.5"
          >
            {(isAttestingClearance || isUndoingClearance) && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {isCleared ? 'Undo Clearance' : 'Confirm Clearance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
