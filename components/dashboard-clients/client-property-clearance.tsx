'use client';

import { Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useClientDetail } from '@/lib/hooks/use-client-detail';
import { useMutation } from '@/lib/hooks/use-mutation';
import { useSession } from '@/lib/hooks/use-session';
import type { ClientProperty } from '@/lib/types/client';

interface ClientPropertyClearanceProps {
  property: ClientProperty;
}

/**
 * Manages lot sale clearance between full payment and title.
 */
export function ClientPropertyClearance({ property }: ClientPropertyClearanceProps) {
  const { undoClearance } = useClientDetail();
  const { hasPermission } = useSession();
  const canClear = hasPermission('billing.update');
  const lotName = `Block ${property.block_number} Lot ${property.lot_number}`;

  const undo = useMutation(undoClearance, {
    onSuccess: () => {
      toast.success(`Clearance undone for ${lotName}`);
    },
  });

  // Status is displayed contextually on the PropertyCallingCard status bar.
  if (property.has_title) return null;
  if (property.status === 'Forfeited') return null;
  if (!property.account_id) return null;
  if (!property.cleared_at) return null;
  if (!canClear) return null;

  return (
    <div className="flex items-center justify-end">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 text-xs text-muted-foreground"
        disabled={undo.state.status === 'pending'}
        onClick={() => void undo.execute(property.account_id!)}
      >
        {undo.state.status === 'pending' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
        Undo
      </Button>
    </div>
  );
}
