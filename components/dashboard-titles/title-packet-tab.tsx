'use client';

import { useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SectionCard, SectionHeader } from '@/components/ui/section-card';
import { StepChecklist, type StepItem } from '@/components/ui/step-checklist';
import { GenerateDeedModal } from './generate-deed-modal';
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
import { formatDocumentName } from '@/lib/format-document-name';
import { formatMediumDate } from '@/lib/format-date';
import { useLandTitles, lotRefLabel } from '@/lib/hooks/use-land-titles';
import { useMutation } from '@/lib/hooks/use-mutation';
import { getDocPrepState, getDocPrepSteps, getReleasedDate } from '@/lib/title-progress';
import { DOCUMENT_FILE_ACCEPT } from '@/lib/validations/document';
import { DOC_TYPE_LABEL, type ClientDocument } from '@/lib/types/client';
import {
  RELEASE_DOCUMENT_TYPES,
  type LandTitle,
  type ReleaseDocumentType,
  type TitleStatus,
} from '@/lib/types/title';

interface TitlePacketTabProps {
  title: LandTitle;
  documents: ClientDocument[];
  onDocumentsChange: (docs: ClientDocument[]) => void;
  isLoadingDocs: boolean;
  isExecutiveSigned: boolean;
  setIsExecutiveSigned: (val: boolean) => void;
  onStatusChange: (nextStatus: TitleStatus, reason?: string) => void;
  isUpdatingStatus: boolean;
}

export function TitlePacketTab({
  title,
  documents,
  onDocumentsChange,
  isLoadingDocs,
  isExecutiveSigned,
  setIsExecutiveSigned,
  onStatusChange,
  isUpdatingStatus,
}: TitlePacketTabProps) {
  const {
    uploadDocument,
    removeDocument,
    getDocumentUrl,
    updateTitleNumber,
    canEdit,
  } = useLandTitles();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<ReleaseDocumentType | null>(null);

  const [busyDocType, setBusyDocType] = useState<string | null>(null);
  const [docToRemove, setDocToRemove] = useState<ClientDocument | null>(null);
  const [isGenerateDeedOpen, setIsGenerateDeedOpen] = useState(false);

  const [revertTarget, setRevertTarget] = useState<'Document Preparation' | 'For Review' | null>(null);
  const [revertReason, setRevertReason] = useState('');

  const currentTct = title.property?.title_number ?? '';
  const [titleNumberInput, setTitleNumberInput] = useState(currentTct);
  const [isEditingTct, setIsEditingTct] = useState(false);

  const isReleased = title.status === 'Released';
  // The released date comes from the shared derivation, so this tab and the
  // rail cannot disagree about when the packet was handed over.
  const releasedAt = getReleasedDate(title);
  const releasedDateStr = releasedAt ? formatMediumDate(releasedAt) : '';

  const latestDocsByType = new Map<string, ClientDocument>();
  for (const doc of documents) {
    if (!latestDocsByType.has(doc.document_type)) latestDocsByType.set(doc.document_type, doc);
  }

  const prep = getDocPrepState(title, documents, isExecutiveSigned);
  const {
    step1Done,
    requiredCount: requiredDocsCount,
    missingCount: missingDocsCount,
    hasRecordedTct,
  } = prep;

  const { state: tctState, execute: runSaveTct } = useMutation(
    async (newTitleNumber: string) => {
      await updateTitleNumber(title.property_id, newTitleNumber);
    },
    {
      onSuccess: () => {
        toast.success('Title number saved');
        setIsEditingTct(false);
      },
    }
  );

  const isSavingTct = tctState.status === 'pending';

  function handleSaveTct(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = titleNumberInput.trim();
    if (!trimmed) {
      toast.error('Title number cannot be empty');
      return;
    }
    void runSaveTct(trimmed);
  }

  function pickFile(type: ReleaseDocumentType) {
    pendingTypeRef.current = type;
    fileInputRef.current?.click();
  }

  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const type = pendingTypeRef.current;
    event.target.value = '';
    if (!file || !type) return;

    setBusyDocType(type);
    try {
      const saved = await uploadDocument(title.title_id, type, file);
      onDocumentsChange([saved, ...documents.filter((d) => d.document_id !== saved.document_id)]);
      toast.success(`${DOC_TYPE_LABEL[type]} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusyDocType(null);
      pendingTypeRef.current = null;
    }
  }

  async function handleConfirmRemoveDoc() {
    if (!docToRemove) return;
    setBusyDocType(docToRemove.document_type as ReleaseDocumentType);
    try {
      await removeDocument(docToRemove);
      onDocumentsChange(documents.filter((d) => d.document_id !== docToRemove.document_id));
      toast.success('Document removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setBusyDocType(null);
      setDocToRemove(null);
    }
  }

  async function handleViewDoc(doc: ClientDocument) {
    try {
      const url = await getDocumentUrl(doc.document_id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to open document');
    }
  }

  const propertyRef = lotRefLabel(title.property);
  const propertyLocation = title.property?.location ?? '';

  const missingDetail = [
    missingDocsCount > 0
      ? `${missingDocsCount} file${missingDocsCount > 1 ? 's' : ''} missing`
      : '',
    !hasRecordedTct ? 'title number missing' : '',
  ]
    .filter(Boolean)
    .join(' • ');

  const prepSteps: StepItem[] = getDocPrepSteps(
    title,
    documents,
    isExecutiveSigned,
    missingDetail
  );

  return (
    <div className="space-y-6">
      {/* Release Status Banner */}
      {isReleased && (
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-[color-mix(in_srgb,var(--success)_8%,var(--card))] px-3.5 py-2.5 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <span>Title released{releasedDateStr ? ` on ${releasedDateStr}` : ''}.</span>
        </div>
      )}

      {/* Stage Management Section */}
      {!isReleased && canEdit && (
        <SectionCard className="space-y-3">
          <SectionHeader
            title="Stage Management"
            action={
              <Badge variant="outline">
                Current: {title.status}
              </Badge>
            }
          />

          {/* Stage: Cleared by Billing */}
          {title.status === 'Cleared by Billing' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Account cleared by Billing. Begin document preparation to start collecting turnover requirements.
              </p>
              <Button
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange('Document Preparation')}
                className="text-sm gap-2 h-9 px-4 shrink-0 font-medium"
              >
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Begin Document Preparation
              </Button>
            </div>
          )}

          {/* Stage: Document Preparation */}
          {title.status === 'Document Preparation' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-sm text-muted-foreground">
                {step1Done
                  ? 'All release documents and title number are recorded. Ready to submit for review.'
                  : 'Upload all required release documents and record the title number to submit for review.'}
              </p>
              <Button
                size="sm"
                disabled={!step1Done || isUpdatingStatus}
                onClick={() => onStatusChange('For Review')}
                className="text-sm gap-2 h-9 px-4 shrink-0 font-medium"
              >
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Submit for Review
              </Button>
            </div>
          )}

          {/* Stage: For Review */}
          {title.status === 'For Review' && (
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Packet is under supervisor review. Verify technical description and required turnover documents.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border">
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  disabled={isUpdatingStatus}
                  onClick={() => {
                    setRevertTarget('Document Preparation');
                    setRevertReason('');
                  }}
                  className="text-sm gap-2 h-9 px-4 font-medium text-destructive hover:bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Revert to Preparation
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isUpdatingStatus}
                  onClick={() => onStatusChange('For Signature')}
                  className="text-sm gap-2 h-9 px-4 font-medium"
                >
                  {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve Review & Advance
                </Button>
              </div>
            </div>
          )}

          {/* Stage: For Signature */}
          {title.status === 'For Signature' && (
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-row-hover">
                <Checkbox
                  id="stage-exec-signed"
                  checked={isExecutiveSigned}
                  disabled={isUpdatingStatus}
                  onCheckedChange={(checked) => setIsExecutiveSigned(Boolean(checked))}
                  className="h-4 w-4 mt-0.5"
                />
                <label
                  htmlFor="stage-exec-signed"
                  className="text-sm font-medium text-foreground cursor-pointer select-none leading-tight"
                >
                  Executive Management Signature & Notarization Confirmed
                  <span className="block text-xs text-muted-foreground mt-0.5 font-normal">
                    Confirm when Deed of Absolute Sale is signed by executive management and notarized.
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border">
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  disabled={isUpdatingStatus}
                  onClick={() => {
                    setRevertTarget('For Review');
                    setRevertReason('');
                  }}
                  className="text-sm gap-2 h-9 px-4 font-medium text-destructive hover:bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Revert to Review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!isExecutiveSigned || isUpdatingStatus}
                  onClick={() => onStatusChange('Clearance Period')}
                  className="text-sm gap-2 h-9 px-4 font-medium"
                >
                  {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Start 30-Day Clearance
                </Button>
              </div>
            </div>
          )}

          {/* Past Document Prep stages */}
          {title.status !== 'Document Preparation' && title.status !== 'For Review' && title.status !== 'For Signature' && (
            <p className="text-sm text-muted-foreground pt-1">
              Document preparation and executive sign-off are complete for this title.
            </p>
          )}
        </SectionCard>
      )}

      {/* Document Preparation Workflow Checklist */}
      <SectionCard className="space-y-3">
        <SectionHeader
          title="Document Preparation & Verification Workflow"
          description="Track packet readiness, supervisor review, and executive sign-off."
          action={
            isUpdatingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : undefined
          }
        />

        {/*
          The four rows below were 130 lines of near-identical markup — the same
          border, the same icon slot, the same title/detail/badge arrangement
          written out once per step. They are one `StepChecklist` now, which is
          what makes a completed step look the same here as it does in the rail.
        */}
        <StepChecklist
          ariaLabel="Document preparation and verification steps"
          items={prepSteps}
        />
      </SectionCard>

      {/* Title Number Card */}
      <SectionCard className="space-y-2">
        <SectionHeader
          title={`Title number on ${[propertyRef, propertyLocation].filter(Boolean).join(', ')}`}
          action={
            canEdit && !isReleased && !isEditingTct ? (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => {
                  setTitleNumberInput(currentTct);
                  setIsEditingTct(true);
                }}
                className="gap-1.5 text-sm h-9 px-3.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : undefined
          }
        />
        <div>
          {!isEditingTct && title.property?.title_number ? (
            <p className="font-mono text-sm font-semibold text-foreground">
              {title.property.title_number}
            </p>
          ) : !isEditingTct ? (
            <p className="text-sm text-warning font-medium">
              No title number recorded on lot (Required to submit for review)
            </p>
          ) : null}
        </div>

        {isEditingTct && (
          <form onSubmit={handleSaveTct} className="mt-2 flex items-center gap-2">
            <Input
              value={titleNumberInput}
              onChange={(e) => setTitleNumberInput(e.target.value)}
              placeholder="e.g. T-123456"
              className="h-9 font-mono text-sm flex-1"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 text-sm"
              disabled={isSavingTct || !titleNumberInput.trim()}
            >
              {isSavingTct ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              className="h-9 px-4 text-sm"
              onClick={() => {
                setTitleNumberInput(currentTct);
                setIsEditingTct(false);
              }}
            >
              Cancel
            </Button>
          </form>
        )}
      </SectionCard>

      {/* Release Packet Checklist */}
      <div className="space-y-3">
        <SectionHeader
          title="Release Packet Documents"
          action={
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              {isLoadingDocs && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {requiredDocsCount - missingDocsCount} of {requiredDocsCount} uploaded
            </span>
          }
        />

        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {RELEASE_DOCUMENT_TYPES.map((type) => {
            const isSkipped = type === 'Deed of Sale' && title.is_legacy_transferred;
            const doc = latestDocsByType.get(type);
            const isBusy = busyDocType === type;

            return (
              <div
                key={type}
                className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-row-hover transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isSkipped ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : doc ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {DOC_TYPE_LABEL[type]}
                    </p>
                    {isSkipped ? (
                      <p className="text-xs text-muted-foreground italic">
                        Omitted — Title already in client name
                      </p>
                    ) : doc ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDocumentName(doc.file_path)} • {formatMediumDate(doc.uploaded_at)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Required for turnover</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {doc && (
                    <>
                      <Button
                        type="button"
                        variant="quiet"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-foreground"
                        onClick={() => void handleViewDoc(doc)}
                        title="View document"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {canEdit && !isReleased && (
                        <Button
                          type="button"
                          variant="quiet"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]"
                          onClick={() => setDocToRemove(doc)}
                          title="Remove document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {type === 'Deed of Sale' && !isSkipped && canEdit && !isReleased && (
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      className="h-9 px-3.5 text-sm gap-2"
                      onClick={() => setIsGenerateDeedOpen(true)}
                      title="Generate editable Word Deed of Sale (.docx)"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Generate
                    </Button>
                  )}
                  {!isSkipped && canEdit && !isReleased && (
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      className="h-9 px-4 text-sm gap-2"
                      disabled={isBusy}
                      onClick={() => pickFile(type)}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {doc ? 'Replace' : 'Upload'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={DOCUMENT_FILE_ACCEPT}
        className="hidden"
        onChange={handleFileChosen}
      />

      {/* Confirmation Alert to Remove Document */}
      <AlertDialog open={docToRemove !== null} onOpenChange={(open) => !open && setDocToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove document?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to remove &quot;
              {docToRemove ? formatDocumentName(docToRemove.file_path) : 'this document'}
              &quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmRemoveDoc()}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Stage Dialog */}
      <AlertDialog
        open={revertTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevertTarget(null);
            setRevertReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Revert stage to {revertTarget === 'Document Preparation' ? 'Document Preparation' : 'Legal Supervisor Review'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {revertTarget === 'Document Preparation'
                ? 'This will return this title packet back to Document Preparation for revisions or missing files.'
                : 'This will return this title packet back to Legal Supervisor Review.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5 py-1">
            <label htmlFor="revert-reason" className="text-xs font-medium text-foreground">
              Reason for revert (optional)
            </label>
            <Input
              id="revert-reason"
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              placeholder="e.g. Discrepancy in deed of sale, technical corrections..."
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdatingStatus}
              onClick={(e) => {
                e.preventDefault();
                if (!revertTarget) return;
                const target = revertTarget;
                const reason = revertReason.trim();
                setRevertTarget(null);
                setRevertReason('');
                onStatusChange(target, reason || undefined);
              }}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              {isUpdatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Confirm Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal to configure and download Deed of Sale (.docx) */}
      <GenerateDeedModal
        open={isGenerateDeedOpen}
        onOpenChange={setIsGenerateDeedOpen}
        title={title}
      />
    </div>
  );
}
