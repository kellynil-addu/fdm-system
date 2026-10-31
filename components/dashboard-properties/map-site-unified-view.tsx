'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
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
import { LoadingButton } from '@/components/ui/loading-button';
import { PanelLeftOpen, PenTool, AlertTriangle } from 'lucide-react';
import { SiteMap } from './map-site';
import { PropertyLotsSidebar } from './property-lots-sidebar';
import { MapSiteEditor, type SelectedPlotInfo, type ActiveDraftState } from './map-site-editor';
import {
  createSite,
  batchCreateSubdivisionLots,
  updateSubdivisionLotBoundary,
  deleteSubdivisionLot,
  archiveSite,
  unarchiveSite,
  deleteSite,
} from '@/lib/actions/sites';
import { parseRing, calculatePolygonAreaSqm, isPolygonContained } from '@/lib/geometry';
import { getSiteDraft, saveSiteDraft, clearSiteDraft } from '@/lib/storage/map-draft-storage';
import type {
  PropertyLotWithClient,
  SiteWithLots,
  DraftLot,
  PendingBoundaryUpdate,
} from '@/lib/types/property';
import type { LotPlotProperties } from './map-site-popup';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface SiteMapUnifiedViewProps {
  sites: SiteWithLots[];
}

/** Interactive site map, floating property lots sidebar, and integrated draft-driven CAD map editor. */
export function SiteMapUnifiedView({ sites }: SiteMapUnifiedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetLotId = searchParams.get('lot');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hoveredLotKey, setHoveredLotKey] = useState<string | null>(null);
  const [selectedPropertyLot, setSelectedPropertyLot] = useState<PropertyLotWithClient | null>(() => {
    if (!targetLotId) return null;
    for (const site of sites) {
      const match = site.lots.find((l) => l.property_id === targetLotId);
      if (match) return match;
    }
    return null;
  });
  const [createInitialValues, setCreateInitialValues] = useState<{
    site_id?: string;
    block_number?: number;
    lot_number?: number;
    area_size?: number;
    price_per_sqm?: number;
  } | null>(null);

  // Editor states
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(() => {
    if (targetLotId) {
      for (const site of sites) {
        if (site.lots.some((l) => l.property_id === targetLotId)) {
          return site.site_id;
        }
      }
    }
    // No auto-selection: an empty selection is the "all sites" view, and clicking a site
    // marker or picking one in the editor is what makes a site active.
    return null;
  });

  // Entry confirmation dialog
  const [isEntryConfirmOpen, setIsEntryConfirmOpen] = useState(false);

  // Exit guard dialog when unsaved drafts exist
  const [isExitGuardOpen, setIsExitGuardOpen] = useState(false);
  const [pendingExitTarget, setPendingExitTarget] = useState<
    'leaveSite' | 'exitEditor' | null
  >(null);

  // Drawing & Plotting states
  const [plotType, setPlotType] = useState<'lot' | 'site' | null>(null);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [selectedPlotToDelete, setSelectedPlotToDelete] = useState<SelectedPlotInfo | null>(null);
  const [pendingSiteBoundary, setPendingSiteBoundary] = useState<[number, number][] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Draft session queue for active site
  const [draftLots, setDraftLots] = useState<DraftLot[]>([]);
  const [pendingBoundaryUpdates, setPendingBoundaryUpdates] = useState<PendingBoundaryUpdate[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveDraftState | null>(null);
  const [editingSubdivisionId, setEditingSubdivisionId] = useState<string | null>(null);
  const [hasStoredDraft, setHasStoredDraft] = useState(false);

  // Active site boundary ring for ray-casting containment
  const activeSite = useMemo(() => sites.find((s) => s.site_id === activeSiteId), [sites, activeSiteId]);
  const activeSiteRing = useMemo(() => {
    if (!activeSite?.boundary) return null;
    return parseRing(activeSite.boundary);
  }, [activeSite]);

  // Out-of-bounds vertex status. Only meaningful for lots: a new site boundary is plotted
  // outside every existing site ring by definition, so containment must not gate it.
  const hasOutOfBoundsVertex = useMemo(() => {
    if (plotType !== 'lot' || !activeSiteRing || draftPoints.length === 0) return false;
    return !isPolygonContained(draftPoints, activeSiteRing);
  }, [plotType, draftPoints, activeSiteRing]);

  // Sync selected lot from targetLotId URL param
  useEffect(() => {
    if (!targetLotId) return;
    for (const site of sites) {
      const match = site.lots.find((l) => l.property_id === targetLotId);
      if (match) {
        setSelectedPropertyLot(match);
        setIsSidebarOpen(true);
        setActiveSiteId(site.site_id);
        break;
      }
    }
  }, [targetLotId, sites]);

  // Check localStorage for saved draft when active site changes in editor mode
  useEffect(() => {
    if (!isEditorActive || !activeSiteId) {
      setHasStoredDraft(false);
      return;
    }
    const saved = getSiteDraft(activeSiteId);
    if (saved && (saved.draftLots?.length > 0 || saved.pendingBoundaryUpdates?.length > 0)) {
      setHasStoredDraft(true);
    } else {
      setHasStoredDraft(false);
    }
  }, [isEditorActive, activeSiteId]);

  // Debounced auto-save of drafts to localStorage
  const draftLotsRef = useRef(draftLots);
  draftLotsRef.current = draftLots;
  const pendingBoundaryUpdatesRef = useRef(pendingBoundaryUpdates);
  pendingBoundaryUpdatesRef.current = pendingBoundaryUpdates;

  useEffect(() => {
    if (!isEditorActive || !activeSiteId) return;

    const timer = setTimeout(() => {
      const currentLots = draftLotsRef.current;
      const currentUpdates = pendingBoundaryUpdatesRef.current;
      if (currentLots.length > 0 || currentUpdates.length > 0) {
        saveSiteDraft(activeSiteId, {
          siteId: activeSiteId,
          draftLots: currentLots,
          pendingBoundaryUpdates: currentUpdates,
        });
      } else {
        clearSiteDraft(activeSiteId);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isEditorActive, activeSiteId, draftLots, pendingBoundaryUpdates]);

  // beforeunload protection when unsaved drafts exist
  useEffect(() => {
    const hasUnsaved = draftLots.length > 0 || pendingBoundaryUpdates.length > 0;
    if (!hasUnsaved) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draftLots, pendingBoundaryUpdates]);

  const totalLots = sites.reduce((sum, s) => sum + s.lots.length, 0);

  const handleOpenSidebar = useCallback(() => {
    setIsEditorActive(false);
    setPlotType(null);
    setDraftPoints([]);
    setIsSidebarOpen(true);
  }, []);

  const handleSelectLotProperty = useCallback(
    (lot: PropertyLotWithClient) => {
      if (!isEditorActive) {
        setIsSidebarOpen(true);
      }
      setCreateInitialValues(null);
      setSelectedPropertyLot(lot);
    },
    [isEditorActive]
  );

  /** Single site-selection entry point: drives the sidebar filter, the map focus, and the
   * editor's edit target. In the editor this is reached only from the site chooser, where
   * no drafts can exist yet, so switching needs no guard. */
  const handleSelectSite = useCallback((siteId: string | null) => {
    setActiveSiteId(siteId);
  }, []);

  const handleSelectLot = useCallback((lot: PropertyLotWithClient | null) => {
    setCreateInitialValues(null);
    setSelectedPropertyLot(lot);
  }, []);

  const handleSelectUnregistered = useCallback(
    (data: {
      siteId: string;
      block: number;
      lot: number;
      areaSize?: number;
      pricePerSqm?: number;
    }) => {
      if (!isEditorActive) {
        setIsSidebarOpen(true);
      }
      setSelectedPropertyLot(null);
      setCreateInitialValues({
        site_id: data.siteId,
        block_number: data.block,
        lot_number: data.lot,
        area_size: data.areaSize,
        price_per_sqm: data.pricePerSqm,
      });
    },
    [isEditorActive]
  );

  // Entering editor mode is confirmed first, so the drafting rules are stated before any
  // editing is possible.
  const handleRequestEditorEntry = useCallback(() => {
    setIsEntryConfirmOpen(true);
  }, []);

  const handleConfirmEditorEntry = useCallback(() => {
    setIsEntryConfirmOpen(false);
    setIsSidebarOpen(false);
    setIsEditorActive(true);
    // Start at the top of the decision tree: a site may have been selected in view mode,
    // but editing begins with an explicit choice from the site list.
    setActiveSiteId(null);
  }, []);

  // Request leaving the chosen site or exiting editor mode
  const handleLeaveSite = useCallback(() => {
    const hasUnsaved = draftLots.length > 0 || pendingBoundaryUpdates.length > 0;
    if (hasUnsaved) {
      setPendingExitTarget('leaveSite');
      setIsExitGuardOpen(true);
      return;
    }
    setActiveSiteId(null);
    setActiveDraft(null);
    setDraftPoints([]);
    setPlotType(null);
  }, [draftLots, pendingBoundaryUpdates]);

  const handleToggleEditor = useCallback(
    (active: boolean) => {
      if (!active) {
        const hasUnsaved = draftLots.length > 0 || pendingBoundaryUpdates.length > 0;
        if (hasUnsaved) {
          setPendingExitTarget('exitEditor');
          setIsExitGuardOpen(true);
          return;
        }
        setIsEditorActive(false);
        setPlotType(null);
        setDraftPoints([]);
        setActiveDraft(null);
        setSelectedPlotToDelete(null);
        setPendingSiteBoundary(null);
        setIsSidebarOpen(true);
      } else {
        handleRequestEditorEntry();
      }
    },
    [draftLots, pendingBoundaryUpdates, handleRequestEditorEntry]
  );

  // LocalStorage draft recovery actions
  const handleResumeStoredDraft = useCallback(() => {
    if (!activeSiteId) return;
    const saved = getSiteDraft(activeSiteId);
    if (saved) {
      setDraftLots(saved.draftLots ?? []);
      setPendingBoundaryUpdates(saved.pendingBoundaryUpdates ?? []);
      toast.success('Restored previous draft lots.');
    }
    setHasStoredDraft(false);
  }, [activeSiteId]);

  const handleDiscardStoredDraft = useCallback(() => {
    if (!activeSiteId) return;
    clearSiteDraft(activeSiteId);
    setHasStoredDraft(false);
    toast.info('Discarded stored drafts.');
  }, [activeSiteId]);

  // Start plotting shape
  const handleStartPlotting = useCallback((type: 'lot' | 'site') => {
    setPlotType(type);
    setDraftPoints([]);
    setActiveDraft(null);
    setEditingSubdivisionId(null);
    setIsSidebarOpen(false);
  }, []);

  const handleCancelPlotting = useCallback(() => {
    setPlotType(null);
    setDraftPoints([]);
    setActiveDraft(null);
    setEditingSubdivisionId(null);
  }, []);

  const handleAddDraftPoint = useCallback((pt: [number, number]) => {
    setDraftPoints((prev) => [...prev, pt]);
  }, []);

  const handleUndoPoint = useCallback(() => {
    setDraftPoints((prev) => prev.slice(0, -1));
  }, []);

  // Update draft points (from live vertex drag on map canvas)
  const handleUpdateDraftPoints = useCallback((points: [number, number][]) => {
    setDraftPoints(points);
    if (points.length >= 3) {
      const area = Math.max(10, Math.round(calculatePolygonAreaSqm(points) * 100) / 100);
      setActiveDraft((prev) => (prev ? { ...prev, boundary: points, areaSize: area } : null));
    }
  }, []);

  // Finish shape drawing -> open inline lot details panel
  const handleFinishShape = useCallback(() => {
    if (draftPoints.length < 3) {
      toast.error('Plotting requires at least 3 points to form a polygon.');
      return;
    }
    if (plotType === 'lot') {
      const area = Math.max(10, Math.round(calculatePolygonAreaSqm(draftPoints) * 100) / 100);
      setActiveDraft({
        boundary: draftPoints,
        areaSize: area,
        isEditingExisting: Boolean(editingSubdivisionId),
      });
      setPlotType(null);
    } else if (plotType === 'site') {
      setPendingSiteBoundary(draftPoints);
      setPlotType(null);
      setDraftPoints([]);
    }
  }, [draftPoints, plotType, editingSubdivisionId]);

  // Existing lot "Edit Boundary" clicked in popup
  const handleEditBoundary = useCallback((plot: LotPlotProperties) => {
    // Find subdivision boundary for this plot
    let foundBoundary: [number, number][] | null = null;
    for (const site of sites) {
      if (site.site_id === plot.siteId) {
        const sub = site.subdivisions?.find((s) => s.subdivision_id === plot.id);
        if (sub?.boundary) {
          const ring = parseRing(sub.boundary);
          if (ring) {
            foundBoundary = ring as [number, number][];
          }
        }
        break;
      }
    }

    if (!foundBoundary) {
      toast.error('Boundary geometry not found for this lot.');
      return;
    }

    setActiveSiteId(plot.siteId);
    setEditingSubdivisionId(plot.id);
    setDraftPoints(foundBoundary);
    setActiveDraft({
      boundary: foundBoundary,
      // Editing a closed lot has no stored area, so derive it from the ring being edited.
      areaSize:
        plot.areaSize ??
        Math.max(10, Math.round(calculatePolygonAreaSqm(foundBoundary) * 100) / 100),
      block: plot.block,
      lot: plot.lot,
      isEditingExisting: true,
    });
    setPlotType(null);
  }, [sites]);

  // Confirm lot in inline slide-in panel -> queue in draft state
  const handleConfirmDraftLot = useCallback(
    (data: { block_number: number; lot_number: number }) => {
      if (!activeSiteId || !activeDraft) return;

      if (activeDraft.isEditingExisting && editingSubdivisionId) {
        setPendingBoundaryUpdates((prev) => {
          const filtered = prev.filter((p) => p.subdivisionId !== editingSubdivisionId);
          return [
            ...filtered,
            {
              subdivisionId: editingSubdivisionId,
              siteId: activeSiteId,
              block: data.block_number,
              lot: data.lot_number,
              boundary: activeDraft.boundary,
              areaSize: activeDraft.areaSize,
              updatedAt: Date.now(),
            },
          ];
        });
        toast.success(`Block ${data.block_number} Lot ${data.lot_number} boundary queued for save.`);
      } else {
        const newDraft: DraftLot = {
          draftId: crypto.randomUUID(),
          siteId: activeSiteId,
          boundary: activeDraft.boundary,
          block: data.block_number,
          lot: data.lot_number,
          areaSize: activeDraft.areaSize,
          createdAt: Date.now(),
        };
        setDraftLots((prev) => [...prev, newDraft]);
        toast.success(`Block ${data.block_number} Lot ${data.lot_number} added to drafts.`);
      }

      setActiveDraft(null);
      setEditingSubdivisionId(null);
      setDraftPoints([]);
    },
    [activeSiteId, activeDraft, editingSubdivisionId]
  );

  const handleDiscardDraftLot = useCallback(() => {
    setActiveDraft(null);
    setEditingSubdivisionId(null);
    setDraftPoints([]);
  }, []);

  const handleRedrawDraftLot = useCallback(() => {
    setActiveDraft(null);
    setPlotType('lot');
    setDraftPoints([]);
  }, []);

  const handleDiscardAllDrafts = useCallback(() => {
    if (activeSiteId) {
      clearSiteDraft(activeSiteId);
    }
    setDraftLots([]);
    setPendingBoundaryUpdates([]);
    setActiveDraft(null);
    setEditingSubdivisionId(null);
    setDraftPoints([]);
    toast.info('All draft lots discarded.');
  }, [activeSiteId]);

  // Save All drafts & exit editor mode
  const handleSaveAll = useCallback(async () => {
    if (draftLots.length === 0 && pendingBoundaryUpdates.length === 0) {
      setIsEditorActive(false);
      setIsSidebarOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Batch create new draft lots
      if (draftLots.length > 0) {
        const payload = draftLots.map((d) => ({
          site_id: d.siteId,
          block_number: d.block!,
          lot_number: d.lot!,
          boundary: d.boundary,
          area_size: d.areaSize,
        }));
        const res = await batchCreateSubdivisionLots(payload);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
      }

      // 2. Commit boundary updates for existing subdivisions
      for (const update of pendingBoundaryUpdates) {
        const res = await updateSubdivisionLotBoundary({
          subdivision_id: update.subdivisionId,
          site_id: update.siteId,
          block_number: update.block,
          lot_number: update.lot,
          boundary: update.boundary,
        });
        if (!res.success) {
          toast.error(res.error);
          return;
        }
      }

      toast.success(
        `Saved ${draftLots.length + pendingBoundaryUpdates.length} change(s) successfully.`
      );

      if (activeSiteId) {
        clearSiteDraft(activeSiteId);
      }
      setDraftLots([]);
      setPendingBoundaryUpdates([]);
      setActiveDraft(null);
      setEditingSubdivisionId(null);
      setDraftPoints([]);
      setIsEditorActive(false);
      setIsSidebarOpen(true);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [draftLots, pendingBoundaryUpdates, activeSiteId, router]);

  // Confirm discarding drafts when exit guard triggers
  const handleConfirmDiscardAndExit = useCallback(() => {
    handleDiscardAllDrafts();
    setIsExitGuardOpen(false);
    if (pendingExitTarget === 'leaveSite') {
      setActiveSiteId(null);
    } else {
      setIsEditorActive(false);
      setIsSidebarOpen(true);
    }
    setPendingExitTarget(null);
  }, [handleDiscardAllDrafts, pendingExitTarget]);

  // Confirm saving drafts when exit guard triggers
  const handleConfirmSaveAndExit = useCallback(async () => {
    setIsExitGuardOpen(false);
    await handleSaveAll();
    if (pendingExitTarget === 'leaveSite') {
      setActiveSiteId(null);
      setIsEditorActive(true);
      setIsSidebarOpen(false);
    }
    setPendingExitTarget(null);
  }, [handleSaveAll, pendingExitTarget]);

  // Save brand-new site
  const handleSaveSite = useCallback(
    async (data: { name: string; description?: string }) => {
      if (!pendingSiteBoundary) return;
      setIsSaving(true);
      try {
        const result = await createSite({
          name: data.name,
          description: data.description,
          boundary: pendingSiteBoundary,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const created = result.data;
        toast.success(`Site "${created.name}" created successfully.`);
        setPendingSiteBoundary(null);
        setActiveSiteId(created.site_id);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create site');
      } finally {
        setIsSaving(false);
      }
    },
    [pendingSiteBoundary, router]
  );

  const handleDeletePlotTrigger = useCallback((plot: SelectedPlotInfo) => {
    setSelectedPlotToDelete(plot);
  }, []);

  const handleConfirmDeletePlot = useCallback(async () => {
    if (!selectedPlotToDelete) return;
    setIsSaving(true);
    try {
      const result = await deleteSubdivisionLot({
        subdivision_id: selectedPlotToDelete.subdivisionId,
        site_id: selectedPlotToDelete.siteId,
        block_number: selectedPlotToDelete.block,
        lot_number: selectedPlotToDelete.lot,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Block ${selectedPlotToDelete.block} Lot ${selectedPlotToDelete.lot} deleted successfully.`
      );
      setSelectedPlotToDelete(null);
      setSelectedPropertyLot(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete plot');
    } finally {
      setIsSaving(false);
    }
  }, [selectedPlotToDelete, router]);

  const handleArchiveSite = useCallback(
    async (siteId: string) => {
      setIsSaving(true);
      try {
        const result = await archiveSite(siteId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success('Site archived successfully');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to archive site');
      } finally {
        setIsSaving(false);
      }
    },
    [router]
  );

  const handleUnarchiveSite = useCallback(
    async (siteId: string) => {
      setIsSaving(true);
      try {
        const result = await unarchiveSite(siteId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success('Site restored successfully');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to restore site');
      } finally {
        setIsSaving(false);
      }
    },
    [router]
  );

  const handleDeleteSite = useCallback(
    async (siteId: string) => {
      setIsSaving(true);
      try {
        const result = await deleteSite(siteId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success('Site deleted successfully');
        setActiveSiteId(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete site');
      } finally {
        setIsSaving(false);
      }
    },
    [router]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex flex-1 h-full min-h-0 w-full flex-col overflow-hidden">
        {/* Background: Edge-to-edge interactive MapLibre canvas */}
        <div className="absolute inset-0 h-full w-full flex flex-col">
          <SiteMap
            sites={sites}
            isSidebarOpen={isSidebarOpen}
            hoveredLotKey={hoveredLotKey}
            selectedLotId={selectedPropertyLot?.property_id}
            onSelectLotProperty={handleSelectLotProperty}
            onSelectUnregistered={handleSelectUnregistered}
            isEditorMode={isEditorActive}
            isPlotting={plotType !== null}
            plotType={plotType}
            draftPoints={draftPoints}
            onAddDraftPoint={handleAddDraftPoint}
            onDeletePlot={handleDeletePlotTrigger}
            onEditBoundary={handleEditBoundary}
            focusedSiteId={activeSiteId}
            onSelectSite={handleSelectSite}
            activeSiteRing={activeSiteRing}
            draftLots={draftLots}
            pendingBoundaryUpdates={pendingBoundaryUpdates}
            onUpdateDraftPoints={handleUpdateDraftPoints}
            isAdjustingVertices={activeDraft !== null}
          />
        </div>

        {/* Floating Map Editor button at top-right when editor is NOT active */}
        {!isEditorActive && (
          <div className="absolute top-4 right-16 z-20">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestEditorEntry}
              className="h-8 gap-1.5 rounded-xl border border-border bg-card px-3 shadow-md hover:bg-row-hover text-foreground font-semibold text-xs"
              title="Enter interactive map editor"
            >
              <PenTool className="h-3.5 w-3.5 text-primary" />
              <span>Map Editor</span>
            </Button>
          </div>
        )}

        {/* Floating Map Editor Shell */}
        <MapSiteEditor
          sites={sites}
          activeSiteId={activeSiteId}
          onSelectSite={handleSelectSite}
          onLeaveSite={handleLeaveSite}
          isEditorActive={isEditorActive}
          onToggleEditor={handleToggleEditor}
          plotType={plotType}
          onStartPlotting={handleStartPlotting}
          onCancelPlotting={handleCancelPlotting}
          draftPointsCount={draftPoints.length}
          onUndoPoint={handleUndoPoint}
          onFinishShape={handleFinishShape}
          hasOutOfBoundsVertex={hasOutOfBoundsVertex}
          activeDraft={activeDraft}
          onConfirmDraftLot={handleConfirmDraftLot}
          onDiscardDraftLot={handleDiscardDraftLot}
          onRedrawDraftLot={handleRedrawDraftLot}
          selectedPlotToDelete={selectedPlotToDelete}
          onConfirmDeletePlot={handleConfirmDeletePlot}
          onCancelDeletePlot={() => setSelectedPlotToDelete(null)}
          pendingSiteBoundary={pendingSiteBoundary}
          onSaveSite={handleSaveSite}
          onDiscardSite={() => setPendingSiteBoundary(null)}
          draftLotsCount={draftLots.length}
          pendingUpdatesCount={pendingBoundaryUpdates.length}
          onSaveAll={handleSaveAll}
          onDiscardAllDrafts={handleDiscardAllDrafts}
          isSaving={isSaving}
          hasStoredDraft={hasStoredDraft}
          onResumeStoredDraft={handleResumeStoredDraft}
          onDiscardStoredDraft={handleDiscardStoredDraft}
          onArchiveSite={handleArchiveSite}
          onUnarchiveSite={handleUnarchiveSite}
          onDeleteSite={handleDeleteSite}
        />

        {/* Floating Collapsible Card on Left (View Mode only) */}
        <div
          className={cn(
            'absolute bottom-2 left-2 top-2 z-20 w-[calc(100vw-1rem)] sm:bottom-4 sm:left-4 sm:top-4 sm:w-[460px] sm:max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out',
            isSidebarOpen && !isEditorActive && !plotType
              ? 'translate-x-0 opacity-100 pointer-events-auto'
              : '-translate-x-[calc(100%+2rem)] opacity-0 pointer-events-none'
          )}
        >
          <PropertyLotsSidebar
            sites={sites}
            onClose={() => setIsSidebarOpen(false)}
            selectedLot={selectedPropertyLot}
            onSelectLot={handleSelectLot}
            onHoverLot={setHoveredLotKey}
            onSiteFilterChange={handleSelectSite}
            siteFilter={activeSiteId}
            createInitialValues={createInitialValues}
            onClearCreateInitialValues={() => setCreateInitialValues(null)}
          />
        </div>

        {/* Floating expand toggle button when card is collapsed and editor is not active */}
        {!isSidebarOpen && !isEditorActive && !plotType && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSidebar}
            className="absolute left-4 top-4 z-20 gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg hover:bg-row-hover text-foreground font-medium"
            aria-label="Open property lots panel"
          >
            <PanelLeftOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Property Lots</span>
            <span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] text-accent-blue-foreground font-medium">
              {totalLots}
            </span>
          </Button>
        )}

        {/* Editor Entry Confirmation Dialog */}
        <AlertDialog open={isEntryConfirmOpen} onOpenChange={setIsEntryConfirmOpen}>
          <AlertDialogContent className="max-w-md bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-base font-bold">
                <PenTool className="h-4 w-4 text-primary" />
                <span>Enter Map Editor?</span>
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground">
                  <p>
                    You are entering <strong>interactive editing mode</strong>.
                  </p>
                  <div className="space-y-1.5 rounded-lg border border-border bg-row-hover p-2.5 text-muted-foreground">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-primary">•</span>
                      <span>
                        Edits are <strong>drafted locally</strong> and never applied to the live map
                        until you click <strong>Save All &amp; Exit</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-primary">•</span>
                      <span>
                        You start by <strong>choosing a site</strong>, then edit only within it. Use{' '}
                        <strong>Leave Site</strong> to go back and choose another.
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-primary">•</span>
                      <span>
                        Clicking lots on the map displays editing controls rather than client
                        details.
                      </span>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-2">
              <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmEditorEntry}
                className="bg-primary text-xs font-semibold text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_85%,black)]"
              >
                Enter Editor
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Unsaved Drafts Exit Warning Dialog */}
        <AlertDialog open={isExitGuardOpen} onOpenChange={setIsExitGuardOpen}>
          <AlertDialogContent className="max-w-md bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span>Unsaved Drafts Detected</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-foreground leading-relaxed space-y-2">
                <p>
                  You have <strong>{draftLots.length + pendingBoundaryUpdates.length}</strong> unsaved draft change(s) on{' '}
                  <strong>{sites.find((s) => s.site_id === activeSiteId)?.name ?? 'this site'}</strong>.
                </p>
                <p className="text-muted-foreground">
                  You cannot leave this site or exit the editor until you either commit all changes to the database or discard them.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="text-xs">Stay in Editor</AlertDialogCancel>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDiscardAndExit}
                className="text-xs"
              >
                Discard All Drafts
              </Button>
              <LoadingButton
                size="sm"
                onClick={handleConfirmSaveAndExit}
                isLoading={isSaving}
                loadingText="Saving..."
                className="text-xs font-semibold bg-primary text-primary-foreground"
              >
                Save All &amp; Exit
              </LoadingButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
