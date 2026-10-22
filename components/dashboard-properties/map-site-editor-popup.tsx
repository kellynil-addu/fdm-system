import { PenTool, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/hooks/use-session';
import type { LotPlotProperties } from '@/components/dashboard-properties/map-site-popup';

export interface MapSiteEditorPopupProps {
  plot: LotPlotProperties;
  onEditBoundary: () => void;
  onDeletePlot: () => void;
}

export function MapSiteEditorPopup({ plot, onEditBoundary, onDeletePlot }: MapSiteEditorPopupProps) {
  const { isSystemAdmin } = useSession();

  const isDraft = plot.status === 'Draft';
  const canEditBoundary = !plot.isSiteArchived && !isDraft;
  const canDeletePlot = !isDraft && isSystemAdmin;

  return (
    <div className="min-w-[220px] p-3 font-sans" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
        <div>
          <p className="text-sm font-bold text-foreground">
            Block {plot.block} Lot {plot.lot}
          </p>
          <p className="text-xs text-muted-foreground">{plot.siteName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {plot.isSiteArchived && <Badge variant="muted">Archived</Badge>}
          {plot.hasUnsavedChange && <Badge variant="info">Unsaved</Badge>}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {canEditBoundary && (
          <Button size="sm" variant="outline" className="w-full cursor-pointer gap-1.5" onClick={onEditBoundary}>
            <PenTool className="h-3.5 w-3.5" />
            <span>Edit Boundary</span>
          </Button>
        )}

        {canDeletePlot && (
          <Button
            variant="danger"
            size="sm"
            disabled={plot.isSiteArchived}
            title={plot.isSiteArchived ? 'Restore site before deleting plots' : undefined}
            onClick={plot.isSiteArchived ? undefined : onDeletePlot}
            className="w-full cursor-pointer gap-1.5"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete Plot</span>
          </Button>
        )}

        {isDraft && (
          <p className="text-[11px] text-muted-foreground">
            Unsaved draft. Save all or discard to change it.
          </p>
        )}
      </div>
    </div>
  );
}
