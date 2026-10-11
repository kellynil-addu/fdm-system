'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, FileCheck, FolderOpen, SearchX, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardTableFooter, CardStickyHeader } from '@/components/ui/card';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import { TitleDialog } from './title-dialog';
import { TitleRecordCard } from './title-record-card';
import { TitleStatsStrip } from './title-stats-strip';
import { lotRefLabel, useLandTitles, type LegalTab } from '@/lib/hooks/use-land-titles';
import { useSession } from '@/lib/hooks/use-session';
import type {
  AccountAwaitingTitle,
  LandTitle,
} from '@/lib/types/title';

function EmptyState({
  isFiltered,
  message,
  onClear,
}: {
  isFiltered: boolean;
  message: string;
  onClear: () => void;
}) {
  const Icon = isFiltered ? SearchX : FileCheck;
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-row-hover">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          {isFiltered ? 'No matches' : 'Nothing here yet'}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isFiltered ? 'Try a different search term.' : message}
        </p>
      </div>
      {isFiltered && (
        <Button variant="quiet" onClick={onClear} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Clear search
        </Button>
      )}
    </div>
  );
}

function InitialStagePrompt({ onSelectStage }: { onSelectStage: (tab: LegalTab) => void }) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-row-hover text-muted-foreground">
        <FolderOpen className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Select a workflow stage</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Choose a stage from the toolbar above or the metric strip to view and manage title records.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => onSelectStage('intake')} className="text-xs">
          Intake Queue
        </Button>
        <Button variant="outline" size="sm" onClick={() => onSelectStage('preparation')} className="text-xs">
          In Preparation
        </Button>
        <Button variant="outline" size="sm" onClick={() => onSelectStage('all')} className="text-xs">
          View All Titles <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function TitleRecordsSection({
  initialTitles,
  initialAwaiting,
}: {
  initialTitles: LandTitle[];
  initialAwaiting: AccountAwaitingTitle[];
}) {
  const { hasPermission } = useSession();
  const canCreate = hasPermission('legal.create');
  const canEdit = hasPermission('legal.update');

  const {
    counts,
    filteredTitles,
    filteredAwaiting,
    search,
    setSearch,
    tab,
    setTab,
    createTitle,
    updateTitle,
    revertClearance,
    updateTitleNumber,
    loadDocuments,
    uploadDocument,
    removeDocument,
    getDocumentUrl,
    loadNotices,
    recordNotice,
    resolveNotice,
    undoNoticeStatus,
    uploadNoticeRts,
    getNoticeRtsUrl,
    getNoticeProofUrl,
    deleteNoticeRts,
  } = useLandTitles(initialTitles, initialAwaiting);

  const [selectedDialogItem, setSelectedDialogItem] = useState<
    | { type: 'awaiting'; data: AccountAwaitingTitle }
    | { type: 'title'; data: LandTitle }
    | null
  >(null);

  const cardItems = useMemo(() => {
    const items: (
      | { type: 'awaiting'; data: AccountAwaitingTitle }
      | { type: 'title'; data: LandTitle }
    )[] = [];

    for (const a of filteredAwaiting) {
      items.push({ type: 'awaiting', data: a });
    }
    for (const t of filteredTitles) {
      items.push({ type: 'title', data: t });
    }
    return items;
  }, [filteredAwaiting, filteredTitles]);

  const isSearching = search.trim() !== '';
  const isUnselected = tab === 'unselected';

  return (
    <div className="space-y-6">
      <div>
        <TitleStatsStrip counts={counts} activeTab={tab} onSelectTab={setTab} />
      </div>

      <Card variant="section">
        <CardStickyHeader>
          <FilterToolbar
            className="pt-5 sm:pt-6"
            tabs={{
              value: isUnselected ? '' : tab,
              onChange: (val) => setTab(val as LegalTab),
              ariaLabel: 'Filter by stage',
              items: [
                { value: 'intake', label: 'Intake Queue', count: counts.intake },
                { value: 'preparation', label: 'Preparation', count: counts.preparation },
                { value: 'review', label: 'Review & Signing', count: counts.review },
                { value: 'clearance', label: 'Clearance', count: counts.clearance },
                { value: 'ready', label: 'Ready for Claim', count: counts.ready },
                { value: 'released', label: 'Released', count: counts.released },
                { value: 'all', label: 'All', count: counts.all },
              ],
            }}
            search={{
              value: search,
              onChange: (val) => {
                if (isUnselected && val.trim() !== '') {
                  setTab('all');
                }
                setSearch(val);
              },
              placeholder: 'Search client, lot or TCT number...',
              ariaLabel: 'Search titles',
            }}
            isFiltered={isSearching}
            onClear={() => setSearch('')}
          />
        </CardStickyHeader>

        <div className="p-4 sm:p-6">
          {isUnselected && !isSearching ? (
            <InitialStagePrompt onSelectStage={setTab} />
          ) : cardItems.length === 0 ? (
            <EmptyState
              isFiltered={isSearching && counts.all > 0}
              message={
                tab === 'intake'
                  ? 'No accounts currently awaiting legal intake. Fully paid accounts will appear here once cleared by Billing.'
                  : tab === 'ready'
                  ? 'No titles currently ready for pickup.'
                  : 'No title records in this stage.'
              }
              onClear={() => setSearch('')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cardItems.map((item) => (
                <TitleRecordCard
                  key={
                    item.type === 'awaiting'
                      ? `awaiting-${item.data.account_id}`
                      : `title-${item.data.title_id}`
                  }
                  item={item}
                  onClick={() => setSelectedDialogItem(item)}
                />
              ))}
            </div>
          )}
        </div>

        <CardTableFooter>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {isUnselected && !isSearching
              ? 'Select a stage above to view records'
              : isSearching
              ? `Showing ${cardItems.length} of ${counts.all} records`
              : `${cardItems.length} records`}
          </p>
        </CardTableFooter>
      </Card>

      <TitleDialog
        open={selectedDialogItem !== null}
        onOpenChange={(open) => !open && setSelectedDialogItem(null)}
        selectedItem={selectedDialogItem}
        canCreate={canCreate}
        canEdit={canEdit}
        onStartProcessing={async (account) => {
          const res = await createTitle(account.property.property_id);
          if (res.success) {
            toast.success(`Legal processing started for ${lotRefLabel(account.property)}`);
            return res.data;
          }
          toast.error(res.error);
        }}
        onReturnToBilling={async (account) => {
          const res = await revertClearance(account.account_id);
          if (res.success) {
            toast.success(`Account for ${lotRefLabel(account.property)} returned to Billing`);
          } else {
            toast.error(res.error);
          }
        }}
        onUpdateTitle={async (id, updates) => {
          const res = await updateTitle(id, updates);
          if (!res.success) throw new Error(res.error);
        }}
        onUpdateTitleNumber={updateTitleNumber}
        loadDocuments={loadDocuments}
        uploadDocument={uploadDocument}
        removeDocument={removeDocument}
        getDocumentUrl={getDocumentUrl}
        loadNotices={loadNotices}
        recordNotice={recordNotice}
        resolveNotice={resolveNotice}
        undoNoticeStatus={undoNoticeStatus}
        uploadNoticeRts={uploadNoticeRts}
        getNoticeRtsUrl={getNoticeRtsUrl}
        getNoticeProofUrl={getNoticeProofUrl}
        deleteNoticeRts={deleteNoticeRts}
      />
    </div>
  );
}
