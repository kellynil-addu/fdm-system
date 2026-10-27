'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/lib/hooks/use-session';
import { LoadingButton } from '@/components/ui/loading-button';
import { calculatePolygonAreaSqm } from '@/lib/geometry';
import { getArchiveEligibility } from '@/lib/utils/archive-rules';
import { DeleteSiteDialog } from './site-delete-dialog';
import type { Site, SiteWithLots } from '@/lib/types/property';
import {
  Undo2,
  X,
  Check,
  Trash2,
  MapPin,
  LandPlot,
  AlertTriangle,
  MoreVertical,
  Archive,
  ArchiveRestore,
  RotateCcw,
  Save,
} from 'lucide-react';

export interface SelectedPlotInfo {
  subdivisionId?: string;
  siteId: string;
  siteName?: string;
  block: number;
  lot: number;
  status: string;
}

export interface ActiveDraftState {
  boundary: [number, number][];
  areaSize: number;
  block?: number;
  lot?: number;
  isEditingExisting?: boolean;
}

export interface MapSiteEditorProps {
  sites: (SiteWithLots | Site)[];
  activeSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onLeaveSite: () => void;
  isEditorActive: boolean;
  onToggleEditor: (active: boolean) => void;
  plotType: 'lot' | 'site' | null;
  onStartPlotting: (type: 'lot' | 'site') => void;
  onCancelPlotting: () => void;
  draftPointsCount: number;
  onUndoPoint: () => void;
  onFinishShape: () => void;
  hasOutOfBoundsVertex?: boolean;

  // Active Draft Panel
  activeDraft: ActiveDraftState | null;
  onConfirmDraftLot: (data: { block_number: number; lot_number: number }) => void;
  onDiscardDraftLot: () => void;
  onRedrawDraftLot: () => void;

  // Selected plot deletion
  selectedPlotToDelete: SelectedPlotInfo | null;
  onConfirmDeletePlot: () => Promise<void>;
  onCancelDeletePlot: () => void;

  // New site boundary
  pendingSiteBoundary: [number, number][] | null;
  onSaveSite: (data: { name: string; description?: string }) => Promise<void>;
  onDiscardSite: () => void;

  // Draft session & batch commit
  draftLotsCount: number;
  pendingUpdatesCount: number;
  onSaveAll: () => Promise<void>;
  onDiscardAllDrafts: () => void;
  isSaving: boolean;

  // LocalStorage recovery
  hasStoredDraft?: boolean;
  onResumeStoredDraft?: () => void;
  onDiscardStoredDraft?: () => void;

  // Site options
  onArchiveSite?: (siteId: string) => Promise<void>;
  onUnarchiveSite?: (siteId: string) => Promise<void>;
  onDeleteSite?: (siteId: string) => Promise<void>;
}

export function MapSiteEditor({
  sites,
  activeSiteId,
  onSelectSite,
  onLeaveSite,
  isEditorActive,
  onToggleEditor,
  plotType,
  onStartPlotting,
  onCancelPlotting,
  draftPointsCount,
  onUndoPoint,
  onFinishShape,
  hasOutOfBoundsVertex = false,
  activeDraft,
  onConfirmDraftLot,
  onDiscardDraftLot,
  onRedrawDraftLot,
  selectedPlotToDelete,
  onConfirmDeletePlot,
  onCancelDeletePlot,
  pendingSiteBoundary,
  onSaveSite,
  onDiscardSite,
  draftLotsCount,
  pendingUpdatesCount,
  onSaveAll,
  onDiscardAllDrafts,
  isSaving,
  hasStoredDraft = false,
  onResumeStoredDraft,
  onDiscardStoredDraft,
  onArchiveSite,
  onUnarchiveSite,
  onDeleteSite,
}: MapSiteEditorProps) {
  const { isSystemAdmin } = useSession();

  // Controlled inputs for inline lot-details slide-in panel
  const [lotBlock, setLotBlock] = useState<string>('');
  const [lotNumber, setLotNumber] = useState<string>('');

  // Sync inputs when activeDraft changes (e.g. pre-populate when editing an existing lot)
  useEffect(() => {
    if (activeDraft) {
      setLotBlock(activeDraft.block ? String(activeDraft.block) : '');
      setLotNumber(activeDraft.lot ? String(activeDraft.lot) : '');
    } else {
      setLotBlock('');
      setLotNumber('');
    }
  }, [activeDraft]);

  // Save site form state
  const [siteName, setSiteName] = useState<string>('');
  const [siteDesc, setSiteDesc] = useState<string>('');
  const [isDeleteSiteOpen, setIsDeleteSiteOpen] = useState(false);

  if (!isEditorActive) {
    return null;
  }

  const activeSite = sites.find((s) => s.site_id === activeSiteId);
  const activeSiteEligibility = getArchiveEligibility(
    Boolean(activeSite?.is_archived),
    activeSite?.archived_at
  );
  const calculatedSiteArea = pendingSiteBoundary
    ? Math.round(calculatePolygonAreaSqm(pendingSiteBoundary))
    : 0;

  function handleDraftSubmit(e: React.FormEvent) {
    e.preventDefault();
    const block = parseInt(lotBlock, 10);
    const lot = parseInt(lotNumber, 10);
    if (!block || !lot) return;

    onConfirmDraftLot({
      block_number: block,
      lot_number: lot,
    });
  }

  async function handleSiteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!siteName.trim()) return;

    await onSaveSite({
      name: siteName.trim(),
      description: siteDesc.trim() || undefined,
    });

    setSiteName('');
    setSiteDesc('');
  }

  return (
    <>
      {/* Top-left editor menu and recovery stack */}
      <div className="absolute top-4 left-4 z-30 flex flex-col items-start gap-2 max-w-[calc(100vw-2rem)]">
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-xl transition-all">
          {plotType === null ? (
            !activeSiteId ? (
              /* State: No Site Selected */
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Map Editor</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleEditor(false)}
                    className="h-6 w-6 text-muted-foreground hover:bg-row-hover hover:text-foreground"
                    title="Exit Editor"
                    aria-label="Exit Editor"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <Select
                    value=""
                    onValueChange={onSelectSite}
                    disabled={sites.length === 0}
                  >
                    <SelectTrigger className="h-8 min-w-[170px] border-border bg-row-hover text-xs font-medium focus:ring-0">
                      <SelectValue placeholder="Select site to edit" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.site_id} value={s.site_id} className="text-xs">
                          {s.name}
                          {s.is_archived ? ' (Archived)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStartPlotting('site')}
                    className="h-8 gap-1.5 border-border bg-card text-xs font-medium text-foreground hover:bg-row-hover"
                    title="Plot a new project area boundary"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>+ New Site</span>
                  </Button>
                </div>
              </>
            ) : (
              /* State: Site Selected */
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate max-w-[160px]" title={activeSite?.name}>
                      {activeSite?.name}
                    </span>
                    {activeSite?.is_archived && (
                      <span className="flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--destructive)_30%,transparent)] bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-destructive shrink-0">
                        <Archive className="h-3 w-3" />
                        <span>Archived</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={onLeaveSite}
                      className="text-[11px] font-medium text-primary hover:underline cursor-pointer px-1"
                      title="Leave this site to choose another or create a new site"
                    >
                      Leave Site
                    </button>

                    {isSystemAdmin && activeSite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:bg-row-active hover:text-foreground shrink-0"
                            aria-label={`Site options for ${activeSite.name}`}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Site Options
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            hidden={!activeSite.is_archived}
                            icon={<ArchiveRestore className="h-4 w-4" />}
                            disabled={isSaving}
                            onSelect={() => onUnarchiveSite?.(activeSite.site_id)}
                          >
                            Restore Site
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            hidden={activeSite.is_archived}
                            icon={<Archive className="h-4 w-4" />}
                            disabled={isSaving}
                            onSelect={() => onArchiveSite?.(activeSite.site_id)}
                          >
                            Archive Site
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            hidden={!activeSite.is_archived || !isSystemAdmin}
                            disabled={!activeSiteEligibility.isEligibleForDelete}
                            disabledReason={activeSiteEligibility.tooltipReason}
                            tooltipSide="right"
                            variant="destructive"
                            icon={<Trash2 className="h-4 w-4" />}
                            onSelect={() => setIsDeleteSiteOpen(true)}
                          >
                            Delete Site
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleEditor(false)}
                      className="h-6 w-6 text-muted-foreground hover:bg-row-hover hover:text-foreground shrink-0"
                      title="Exit Editor"
                      aria-label="Exit Editor"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStartPlotting('lot')}
                    disabled={activeSite?.is_archived}
                    className="h-8 gap-1.5 border-border bg-card text-xs font-medium text-foreground hover:bg-row-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      activeSite?.is_archived
                        ? 'Restore site before plotting new lots'
                        : 'Plot a new lot polygon on this site'
                    }
                  >
                    <LandPlot className="h-3.5 w-3.5 text-primary" />
                    <span>+ Plot Lot</span>
                  </Button>
                </div>
              </>
            )
          ) : (
            /* State: Active Plotting */
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="truncate text-xs font-semibold text-foreground">
                    {plotType === 'lot' ? 'Plotting Lot' : 'Plotting New Site'}
                  </span>
                  <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-[11px] font-mono text-accent-blue-foreground shrink-0">
                    {draftPointsCount} {draftPointsCount === 1 ? 'pt' : 'pts'}
                  </span>
                </div>

                {hasOutOfBoundsVertex && (
                  <span className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-destructive shrink-0">
                    <AlertTriangle className="h-3 w-3" />
                    Outside Boundary
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 pt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndoPoint}
                  disabled={draftPointsCount === 0}
                  className="h-7 px-2 text-xs text-foreground hover:bg-row-hover"
                  title="Undo last plotted point"
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1" />
                  Undo
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancelPlotting}
                  className="h-7 px-2 text-xs text-muted-foreground hover:bg-row-hover hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={onFinishShape}
                  disabled={draftPointsCount < 3 || hasOutOfBoundsVertex}
                  className="h-7 gap-1 bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_85%,black)] disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                  title={
                    hasOutOfBoundsVertex
                      ? 'All points must be inside the site boundary to finish'
                      : 'Close shape and enter details'
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                  Finish Shape
                </Button>
              </div>
            </>
          )}
        </div>

        {/* LocalStorage Session Recovery Banner */}
        {hasStoredDraft && activeSite && (
          <div className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-card px-3.5 py-2 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-foreground">
              <RotateCcw className="h-3.5 w-3.5 text-warning shrink-0" />
              <span>
                Unsaved draft for <strong>{activeSite.name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={onResumeStoredDraft}
                className="h-7 px-2 text-xs font-semibold text-primary border-[color-mix(in_srgb,var(--primary)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
              >
                Resume
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDiscardStoredDraft}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom-Right Inline Lot Details Panel (replaces modal Dialog) */}
      {activeDraft && (
        <div className="absolute bottom-4 right-4 z-30 w-80 rounded-2xl border border-border bg-card p-4 shadow-2xl transition-all duration-200">
          <form onSubmit={handleDraftSubmit} className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-sm font-bold text-foreground">
                {activeDraft.isEditingExisting ? 'Edit Lot Boundary' : 'New Lot Details'}
              </span>
              <span className="rounded-md bg-row-hover px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {activeSite?.name}
              </span>
            </div>

            <div className="rounded-lg bg-row-hover p-2.5 text-xs space-y-1 border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculated Area:</span>
                <span className="font-semibold text-foreground">{activeDraft.areaSize} sqm</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="draft-blk" className="text-xs font-medium">
                  Block No. *
                </Label>
                <Input
                  id="draft-blk"
                  type="number"
                  min={1}
                  required
                  autoFocus
                  placeholder="1"
                  value={lotBlock}
                  onChange={(e) => setLotBlock(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="draft-lot" className="text-xs font-medium">
                  Lot No. *
                </Label>
                <Input
                  id="draft-lot"
                  type="number"
                  min={1}
                  required
                  placeholder="1"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 Drag vertex dots on the map to adjust corners in real time.
            </p>

            <div className="flex items-center justify-between pt-1 gap-1.5 border-t border-border">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRedrawDraftLot}
                  className="h-8 px-2 text-xs text-muted-foreground hover:bg-row-hover hover:text-foreground"
                  title="Clear points and re-plot"
                >
                  Redraw
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onDiscardDraftLot}
                  className="h-8 px-2 text-xs border-border text-foreground hover:bg-row-hover"
                >
                  Discard
                </Button>
              </div>

              <Button
                type="submit"
                size="sm"
                className="h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_85%,black)]"
              >
                {activeDraft.isEditingExisting ? 'Update Lot' : 'Add to Drafts'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom-Left Draft Session Badge & Save All & Exit Footer */}
      {(draftLotsCount > 0 || pendingUpdatesCount > 0) && !activeDraft && (
        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              📝 {draftLotsCount + pendingUpdatesCount} Pending Draft
              {draftLotsCount + pendingUpdatesCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDiscardAllDrafts}
              disabled={isSaving}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Discard All
            </Button>

            <LoadingButton
              type="button"
              size="sm"
              onClick={onSaveAll}
              isLoading={isSaving}
              loadingText="Saving..."
              className="h-7 gap-1.5 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_85%,black)] shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save All &amp; Exit</span>
            </LoadingButton>
          </div>
        </div>
      )}

      {/* Save New Site Modal (when plotting a new site boundary) */}
      <Dialog open={pendingSiteBoundary !== null} onOpenChange={(open) => !open && onDiscardSite()}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Save New Site</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSiteSubmit} className="space-y-3.5 py-1">
            <div className="rounded-lg bg-row-hover p-2.5 text-xs space-y-1 border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plotted Perimeter:</span>
                <span className="font-semibold text-foreground">
                  {pendingSiteBoundary?.length ?? 0} corners
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Land Area:</span>
                <span className="font-semibold text-foreground">
                  {calculatedSiteArea.toLocaleString()} sqm
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="site-name-input" className="text-xs font-medium">
                Site Name *
              </Label>
              <Input
                id="site-name-input"
                type="text"
                required
                autoFocus
                placeholder="e.g. San Isidro Heights"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="site-desc-input" className="text-xs font-medium">
                Description (Optional)
              </Label>
              <Input
                id="site-desc-input"
                type="text"
                placeholder="Residential subdivision..."
                value={siteDesc}
                onChange={(e) => setSiteDesc(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDiscardSite}
                disabled={isSaving}
                className="text-xs border-border"
              >
                Discard
              </Button>
              <LoadingButton
                type="submit"
                size="sm"
                isLoading={isSaving}
                loadingText="Creating..."
                className="text-xs bg-primary text-primary-foreground"
              >
                Create Site
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Plot Confirmation Dialog */}
      <Dialog
        open={selectedPlotToDelete !== null}
        onOpenChange={(open) => !open && onCancelDeletePlot()}
      >
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete Plot
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <p className="text-xs text-foreground">
              Are you sure you want to delete{' '}
              <strong className="font-semibold">
                Block {selectedPlotToDelete?.block} Lot {selectedPlotToDelete?.lot}
              </strong>
              {selectedPlotToDelete?.siteName ? ` in ${selectedPlotToDelete.siteName}` : ''}?
            </p>

            {selectedPlotToDelete?.status &&
              selectedPlotToDelete.status !== 'Closed' &&
              selectedPlotToDelete.status !== 'Open' && (
                <Alert variant="destructive" className="p-2.5 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-xs">
                    Block {selectedPlotToDelete.block} Lot {selectedPlotToDelete.lot} is currently{' '}
                    {selectedPlotToDelete.status}. Registered lots can only be deleted while Open, so
                    this will be refused.
                  </AlertDescription>
                </Alert>
              )}

            <Alert variant="warning" className="p-2.5 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-xs">
                This deletes the lot&apos;s record and its polygon. Block{' '}
                {selectedPlotToDelete?.block} Lot {selectedPlotToDelete?.lot} will no longer appear on
                the map.
              </AlertDescription>
            </Alert>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelDeletePlot}
                disabled={isSaving}
                className="text-xs border-border"
              >
                Cancel
              </Button>
              <LoadingButton
                type="button"
                size="sm"
                variant="destructive"
                onClick={onConfirmDeletePlot}
                isLoading={isSaving}
                loadingText="Deleting..."
                className="text-xs"
              >
                Delete Plot
              </LoadingButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {activeSite && (
        <DeleteSiteDialog
          site={activeSite}
          open={isDeleteSiteOpen}
          onOpenChange={setIsDeleteSiteOpen}
          onConfirm={async () => {
            if (onDeleteSite) {
              await onDeleteSite(activeSite.site_id);
            }
            setIsDeleteSiteOpen(false);
          }}
          isPending={isSaving}
        />
      )}
    </>
  );
}
