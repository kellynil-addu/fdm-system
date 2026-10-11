'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  CircleDashed,
  Download,
  ExternalLink,
  FileCheck,
  Inbox,
  Loader2,
  Lock,
  Mail,
  MoreVertical,
  Paperclip,
  Pencil,
  RotateCcw,
  Send,
  ShieldAlert,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDocumentName } from '@/lib/format-document-name';
import { lotRefLabel } from '@/lib/hooks/use-land-titles';
import { useSession } from '@/lib/hooks/use-session';
import { TITLE_STATUS_VARIANT } from '@/lib/status-colors';
import { generateNoticePdf } from '@/lib/reports/pdf-notice-letter';
import { getClearanceProgress } from './title-record-card';
import {
  getMissingReleaseDocuments,
  getRequiredReleaseDocuments,
  isReleasePacketComplete,
} from '@/lib/utils/release-requirements';
import { DOCUMENT_FILE_ACCEPT } from '@/lib/validations/document';
import { DOC_TYPE_LABEL, type ClientDocument } from '@/lib/types/client';
import type {
  AccountAwaitingTitle,
  LandTitle,
  LandTitleNotice,
  ReleaseDocumentType,
  TitleStatus,
} from '@/lib/types/title';
import { RELEASE_DOCUMENT_TYPES } from '@/lib/types/title';

const DATE_FORMAT = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });
const TIME_FORMAT = new Intl.DateTimeFormat('en-PH', { dateStyle: 'short', timeStyle: 'short' });

const LIFECYCLE_STAGES: { status: TitleStatus; label: string; desc: string }[] = [
  { status: 'Cleared by Billing', label: 'Cleared by Billing', desc: 'Account verified & cleared as fully paid' },
  { status: 'Document Preparation', label: 'Document Preparation', desc: 'Assembling packet & drafting DOAS' },
  { status: 'For Review', label: 'For Review', desc: 'Legal supervisor review of technical description' },
  { status: 'For Signature', label: 'For Signature', desc: 'Executive management sign-off & notarization' },
  { status: 'Clearance Period', label: 'Clearance Period', desc: '30-day internal clearance before release' },
  { status: 'Ready for Claim', label: 'Ready for Claim', desc: 'Original TCT & DOAS in vault awaiting buyer' },
  { status: 'Released', label: 'Released', desc: 'Physical packet turned over to buyer' },
];

interface TitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem:
    | { type: 'awaiting'; data: AccountAwaitingTitle }
    | { type: 'title'; data: LandTitle }
    | null;
  canCreate: boolean;
  canEdit: boolean;
  onStartProcessing: (account: AccountAwaitingTitle) => Promise<LandTitle | void>;
  onReturnToBilling: (account: AccountAwaitingTitle) => Promise<void>;
  onUpdateTitle: (
    titleId: string,
    updates: { status?: TitleStatus; clearance_started_at?: string | null }
  ) => Promise<void>;
  onUpdateTitleNumber: (propertyId: string, titleNumber: string) => Promise<void>;
  loadDocuments: (titleId: string) => Promise<ClientDocument[]>;
  uploadDocument: (
    titleId: string,
    type: ReleaseDocumentType,
    file: File
  ) => Promise<ClientDocument>;
  removeDocument: (document: ClientDocument) => Promise<void>;
  getDocumentUrl: (documentId: string) => Promise<string>;
  loadNotices: (titleId: string) => Promise<LandTitleNotice[]>;
  recordNotice: (titleId: string, noticeNumber: number) => Promise<LandTitleNotice>;
  resolveNotice?: (
    titleId: string,
    noticeNumber: number,
    status: 'received' | 'returned_to_sender',
    file: File,
    notes?: string | null
  ) => Promise<LandTitleNotice>;
  undoNoticeStatus?: (titleId: string, noticeNumber: number) => Promise<void>;
  uploadNoticeRts: (
    titleId: string,
    noticeNumber: number,
    file: File,
    reason?: string | null
  ) => Promise<LandTitleNotice>;
  getNoticeRtsUrl: (attachmentId: string) => Promise<string>;
  getNoticeProofUrl?: (attachmentId: string) => Promise<string>;
  deleteNoticeRts: (titleId: string, noticeNumber: number) => Promise<void>;
}

export function TitleDialog({
  open,
  onOpenChange,
  selectedItem,
  canCreate,
  canEdit,
  onStartProcessing,
  onReturnToBilling,
  onUpdateTitle,
  onUpdateTitleNumber,
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
}: TitleDialogProps) {
  const { hasPermission } = useSession();
  const isAdmin = hasPermission('system.update');

  const [activeItem, setActiveItem] = useState(selectedItem);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [busyDocType, setBusyDocType] = useState<string | null>(null);
  const [docToRemove, setDocToRemove] = useState<ClientDocument | null>(null);

  const [notices, setNotices] = useState<LandTitleNotice[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(false);
  const [rtsModalNotice, setRtsModalNotice] = useState<1 | 2 | 3 | null>(null);
  const [rtsReasonInput, setRtsReasonInput] = useState('');
  const [isUploadingRts, setIsUploadingRts] = useState(false);
  const [rtsFileInput, setRtsFileInput] = useState<File | null>(null);
  const [isGeneratingNotice, setIsGeneratingNotice] = useState<number | null>(null);

  const [confirmReleaseOpen, setConfirmReleaseOpen] = useState(false);
  const [confirmStartNotice, setConfirmStartNotice] = useState<1 | 2 | 3 | null>(null);
  const [confirmUndoNotice, setConfirmUndoNotice] = useState<1 | 2 | 3 | null>(null);
  const [noticeStatusChoice, setNoticeStatusChoice] = useState<'received' | 'returned_to_sender'>('received');
  const [statusNotesInput, setStatusNotesInput] = useState('');
  const [statusFileInput, setStatusFileInput] = useState<File | null>(null);
  const [isResolvingNotice, setIsResolvingNotice] = useState(false);
  const [isStartingNotice, setIsStartingNotice] = useState(false);
  const [isUndoingNotice, setIsUndoingNotice] = useState(false);

  const [titleNumberInput, setTitleNumberInput] = useState('');
  const [isSavingTct, setIsSavingTct] = useState(false);
  const [isEditingTct, setIsEditingTct] = useState(false);

  const [isStartingProcessing, setIsStartingProcessing] = useState(false);
  const [isReturningToBilling, setIsReturningToBilling] = useState(false);
  const [confirmReturnAccount, setConfirmReturnAccount] = useState<AccountAwaitingTitle | null>(
    null
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [mobileTab, setMobileTab] = useState<'timeline' | 'content'>('content');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<ReleaseDocumentType | null>(null);
  const statusFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveItem(selectedItem);
  }, [selectedItem]);

  const activeTitle = activeItem?.type === 'title' ? activeItem.data : null;
  const activeAwaiting = activeItem?.type === 'awaiting' ? activeItem.data : null;

  const currentStageStatus: TitleStatus = activeTitle ? activeTitle.status : 'Cleared by Billing';
  const currentStageIdx = LIFECYCLE_STAGES.findIndex((s) => s.status === currentStageStatus);

  const [selectedStage, setSelectedStage] = useState<TitleStatus>(currentStageStatus);

  useEffect(() => {
    setSelectedStage(activeTitle ? activeTitle.status : 'Cleared by Billing');
  }, [activeTitle, activeAwaiting?.account_id, open]);

  const currentTct =
    activeTitle?.property?.title_number ?? activeAwaiting?.property?.title_number ?? '';

  useEffect(() => {
    setTitleNumberInput(currentTct);
    setIsEditingTct(!currentTct);
  }, [currentTct, open]);

  // Load release documents for the active title
  useEffect(() => {
    if (!open || !activeTitle?.title_id) return;
    let cancelled = false;
    setDocuments([]);
    setIsLoadingDocs(true);
    loadDocuments(activeTitle.title_id)
      .then((docs) => !cancelled && setDocuments(docs))
      .catch((err) => !cancelled && toast.error(err instanceof Error ? err.message : 'Failed to load docs'))
      .finally(() => !cancelled && setIsLoadingDocs(false));
    return () => {
      cancelled = true;
    };
  }, [open, activeTitle?.title_id, loadDocuments]);

  // Load notice records and RTS attachments
  useEffect(() => {
    if (!open || !activeTitle?.title_id) return;
    let cancelled = false;
    setNotices([]);
    setIsLoadingNotices(true);
    loadNotices(activeTitle.title_id)
      .then((data) => !cancelled && setNotices(data))
      .catch((err) => !cancelled && toast.error(err instanceof Error ? err.message : 'Failed to load notices'))
      .finally(() => !cancelled && setIsLoadingNotices(false));
    return () => {
      cancelled = true;
    };
  }, [open, activeTitle?.title_id, loadNotices]);

  if (!activeItem) return null;

  async function handleStartLegalProcessing() {
    if (!activeAwaiting) return;
    setIsStartingProcessing(true);
    try {
      const created = await onStartProcessing(activeAwaiting);
      if (created) {
        setActiveItem({ type: 'title', data: created });
        setSelectedStage('Document Preparation');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start legal processing');
    } finally {
      setIsStartingProcessing(false);
    }
  }

  async function handleConfirmReturnToBilling() {
    if (!confirmReturnAccount) return;
    setIsReturningToBilling(true);
    try {
      await onReturnToBilling(confirmReturnAccount);
      setConfirmReturnAccount(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to return to billing');
    } finally {
      setIsReturningToBilling(false);
    }
  }

  async function handleSaveTct(e: React.FormEvent) {
    e.preventDefault();
    const propertyId = activeTitle?.property_id ?? activeAwaiting?.property?.property_id;
    if (!propertyId) return;

    if (!titleNumberInput.trim()) {
      toast.error('Title number cannot be empty');
      return;
    }
    setIsSavingTct(true);
    try {
      await onUpdateTitleNumber(propertyId, titleNumberInput.trim());
      setIsEditingTct(false);
      toast.success('TCT number saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save TCT number');
    } finally {
      setIsSavingTct(false);
    }
  }

  function pickFile(type: ReleaseDocumentType) {
    pendingTypeRef.current = type;
    fileInputRef.current?.click();
  }

  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const type = pendingTypeRef.current;
    event.target.value = '';
    if (!file || !type || !activeTitle) return;

    setBusyDocType(type);
    try {
      const saved = await uploadDocument(activeTitle.title_id, type, file);
      setDocuments((prev) => [saved, ...prev.filter((d) => d.document_id !== saved.document_id)]);
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
      setDocuments((prev) => prev.filter((d) => d.document_id !== docToRemove.document_id));
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

  async function handleStatusChange(nextStatus: TitleStatus) {
    if (!activeTitle) return;
    setIsUpdatingStatus(true);
    try {
      const updates: { status: TitleStatus; clearance_started_at?: string | null } = {
        status: nextStatus,
      };
      if (nextStatus === 'Clearance Period') {
        updates.clearance_started_at = new Date().toISOString();
      }
      await onUpdateTitle(activeTitle.title_id, updates);
      const newHistory = [
        ...(activeTitle.history ?? []),
        {
          history_id: `temp-${Date.now()}`,
          title_id: activeTitle.title_id,
          status: nextStatus,
          changed_at: new Date().toISOString(),
          changed_by: null,
        },
      ];
      setActiveItem({
        type: 'title',
        data: {
          ...activeTitle,
          status: nextStatus,
          clearance_started_at: updates.clearance_started_at ?? activeTitle.clearance_started_at,
          history: newHistory,
        },
      });
      setSelectedStage(nextStatus);
      toast.success(`Status updated to "${nextStatus}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  // Generate Notice Letter and download A4 PDF directly
  async function handleGenerateNotice(noticeNumber: 1 | 2 | 3) {
    if (!activeTitle) return;
    setIsGeneratingNotice(noticeNumber);
    try {
      generateNoticePdf({
        noticeNumber,
        clientName,
        clientAddress: activeTitle.client?.address ?? null,
        propertyLocation,
        lotDescription: propertyRef,
        titleNumber: activeTitle.property?.title_number ?? null,
        titleId: activeTitle.title_id,
      });

      const existingNotice = notices.find((n) => n.notice_number === noticeNumber);
      if (!existingNotice) {
        const savedNotice = await recordNotice(activeTitle.title_id, noticeNumber);
        setNotices((prev) => [
          ...prev.filter((n) => n.notice_number !== noticeNumber),
          savedNotice,
        ]);
      }
      toast.success(
        `${noticeNumber === 1 ? '1st' : noticeNumber === 2 ? '2nd' : 'Final'} Notice downloaded`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate notice');
    } finally {
      setIsGeneratingNotice(null);
    }
  }

  async function handleConfirmStartNotice(noticeNumber: 1 | 2 | 3) {
    if (!activeTitle) return;
    setIsStartingNotice(true);
    try {
      const created = await recordNotice(activeTitle.title_id, noticeNumber);
      setNotices((prev) => [
        ...prev.filter((n) => n.notice_number !== noticeNumber),
        created,
      ]);
      toast.success(
        `${noticeNumber === 1 ? '1st' : noticeNumber === 2 ? '2nd' : 'Final'} Notice started`
      );
      setConfirmStartNotice(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start notice');
    } finally {
      setIsStartingNotice(false);
    }
  }

  async function handleConfirmResolveNotice(noticeNumber: 1 | 2 | 3) {
    if (!activeTitle || !statusFileInput) return;
    setIsResolvingNotice(true);
    try {
      let updated: LandTitleNotice;
      if (resolveNotice) {
        updated = await resolveNotice(
          activeTitle.title_id,
          noticeNumber,
          noticeStatusChoice,
          statusFileInput,
          statusNotesInput.trim() || null
        );
      } else {
        updated = await uploadNoticeRts(
          activeTitle.title_id,
          noticeNumber,
          statusFileInput,
          statusNotesInput.trim() || null
        );
      }
      setNotices((prev) => [
        ...prev.filter((n) => n.notice_number !== noticeNumber),
        updated,
      ]);
      setStatusFileInput(null);
      setStatusNotesInput('');
      toast.success(
        `Notice ${noticeNumber} marked as ${
          noticeStatusChoice === 'received' ? 'Received' : 'Returned to Sender'
        }`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update notice status');
    } finally {
      setIsResolvingNotice(false);
    }
  }

  async function handleConfirmUndoNotice(noticeNumber: 1 | 2 | 3) {
    if (!activeTitle) return;
    setIsUndoingNotice(true);
    try {
      if (undoNoticeStatus) {
        await undoNoticeStatus(activeTitle.title_id, noticeNumber);
      } else {
        await deleteNoticeRts(activeTitle.title_id, noticeNumber);
      }
      setNotices((prev) =>
        prev.map((n) =>
          n.notice_number === noticeNumber
            ? {
                ...n,
                status: 'ongoing',
                rts_attachment_id: null,
                rts_attachment: null,
                rts_reason: null,
                tracking_number: null,
                status_updated_at: null,
              }
            : n
        )
      );
      toast.success(`Notice ${noticeNumber} status reverted to Ongoing`);
      setConfirmUndoNotice(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to undo notice status');
    } finally {
      setIsUndoingNotice(false);
    }
  }

  async function handleViewNoticeProof(attachmentId: string) {
    try {
      const url = getNoticeProofUrl
        ? await getNoticeProofUrl(attachmentId)
        : await getNoticeRtsUrl(attachmentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to open proof document');
    }
  }

  async function handleConfirmUploadRts() {
    if (!rtsModalNotice || !rtsFileInput || !activeTitle) return;
    setIsUploadingRts(true);
    try {
      const updated = await uploadNoticeRts(
        activeTitle.title_id,
        rtsModalNotice,
        rtsFileInput,
        rtsReasonInput.trim() || null
      );
      setNotices((prev) => [
        ...prev.filter((n) => n.notice_number !== rtsModalNotice),
        updated,
      ]);
      toast.success(`Notice ${rtsModalNotice} RTS uploaded`);
      setRtsModalNotice(null);
      setRtsFileInput(null);
      setRtsReasonInput('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload RTS');
    } finally {
      setIsUploadingRts(false);
    }
  }

  const latestDocsByType = new Map<string, ClientDocument>();
  for (const doc of documents) {
    if (!latestDocsByType.has(doc.document_type)) latestDocsByType.set(doc.document_type, doc);
  }

  const requiredDocs = activeTitle ? getRequiredReleaseDocuments(activeTitle.is_legacy_transferred) : [];
  const missingDocs = activeTitle
    ? getMissingReleaseDocuments(activeTitle.is_legacy_transferred, latestDocsByType.keys())
    : [];
  const hasRecordedTct = Boolean(activeTitle?.property?.title_number?.trim());
  const packetIsComplete =
    activeTitle &&
    isReleasePacketComplete(activeTitle.is_legacy_transferred, latestDocsByType.keys(), hasRecordedTct);

  const clearance = getClearanceProgress(activeTitle?.clearance_started_at);

  function getStageTimestamp(stageStatus: TitleStatus): string | null {
    if (stageStatus === 'Cleared by Billing') {
      if (activeAwaiting?.cleared_at) return activeAwaiting.cleared_at;
      const entry = activeTitle?.history?.find((h) => h.status === 'Cleared by Billing');
      return entry?.changed_at ?? activeTitle?.created_at ?? null;
    }
    const entry = activeTitle?.history?.find((h) => h.status === stageStatus);
    if (entry) return entry.changed_at;
    if (stageStatus === 'Document Preparation' && activeTitle) return activeTitle.created_at;
    if (stageStatus === 'Clearance Period' && activeTitle?.clearance_started_at) {
      return activeTitle.clearance_started_at;
    }
    return null;
  }

  function formatStageTime(timestamp: string | null): string | null {
    if (!timestamp) return null;
    const d = new Date(timestamp);
    return Number.isNaN(d.getTime()) ? null : TIME_FORMAT.format(d);
  }

  const clientName = activeTitle?.client?.full_name ?? activeAwaiting?.client?.full_name ?? 'Client Account';
  const propertyRef = lotRefLabel(activeTitle?.property ?? activeAwaiting?.property);
  const propertyLocation = activeTitle?.property?.location ?? activeAwaiting?.property?.location ?? '';

  const reachedStages = LIFECYCLE_STAGES.slice(0, Math.max(0, currentStageIdx) + 1);
  const timelineStages = [...reachedStages].reverse();

  function formatDaysAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'ended today';
    if (diffDays === 1) return 'ended 1 day ago';
    return `ended ${diffDays} days ago`;
  }

  function getDynamicStageDescription(stageStatus: TitleStatus): string {
    if (stageStatus === 'Cleared by Billing') {
      const clearedAt =
        activeAwaiting?.cleared_at ??
        activeTitle?.history?.find((h) => h.status === 'Cleared by Billing')?.changed_at ??
        activeTitle?.created_at;
      return clearedAt
        ? `Cleared by Billing on ${DATE_FORMAT.format(new Date(clearedAt))}`
        : 'Account verified & cleared as fully paid';
    }

    if (stageStatus === 'Document Preparation') {
      if (!hasRecordedTct && missingDocs.length > 0) {
        return `${missingDocs.length} file${missingDocs.length > 1 ? 's' : ''} missing • TCT missing`;
      }
      if (missingDocs.length > 0) {
        return `${missingDocs.length} file${missingDocs.length > 1 ? 's' : ''} missing`;
      }
      if (!hasRecordedTct) {
        return 'TCT number missing';
      }
      return `Release packet complete (${requiredDocs.length}/${requiredDocs.length})`;
    }

    if (stageStatus === 'For Review') {
      const reviewEntry = activeTitle?.history?.find((h) => h.status === 'For Review');
      if (reviewEntry) {
        return `Supervisor review completed on ${DATE_FORMAT.format(new Date(reviewEntry.changed_at))}`;
      }
      if (currentStageStatus === 'For Review') {
        return 'Pending Legal Supervisor review';
      }
      return 'Legal supervisor review of technical description';
    }

    if (stageStatus === 'For Signature') {
      const signEntry = activeTitle?.history?.find((h) => h.status === 'For Signature');
      const isSignedOrPast =
        Boolean(signEntry) ||
        currentStageIdx >= LIFECYCLE_STAGES.findIndex((s) => s.status === 'For Signature');
      return isSignedOrPast ? 'Signed by Executive Management' : 'Awaiting executive sign-off';
    }

    if (stageStatus === 'Clearance Period') {
      if (clearance.isComplete && clearance.targetDate) {
        return `Clearance window ${formatDaysAgo(clearance.targetDate)}`;
      }
      if (clearance.isComplete) {
        return 'Clearance window ended';
      }
      if (activeTitle?.clearance_started_at) {
        return `${clearance.daysRemaining} days remaining in 30-day window`;
      }
      return '30-day internal clearance before release';
    }

    if (stageStatus === 'Ready for Claim') {
      if (notices.length > 0) {
        const sorted = [...notices].sort((a, b) => b.notice_number - a.notice_number);
        const latest = sorted[0];
        const nth =
          latest.notice_number === 1
            ? '1st'
            : latest.notice_number === 2
            ? '2nd'
            : 'Final';
        if (latest.status === 'returned_to_sender') {
          const timeStr = formatStageTime(latest.status_updated_at ?? latest.updated_at);
          return `${nth} notice returned to sender on ${timeStr ?? 'record'}`;
        }
        if (latest.status === 'received') {
          const timeStr = formatStageTime(latest.status_updated_at ?? latest.updated_at);
          return `${nth} notice received on ${timeStr ?? 'record'}`;
        }
        const timeStr = formatStageTime(latest.generated_at ?? latest.created_at);
        return `${nth} notice ongoing (started ${timeStr ?? 'record'})`;
      }
      return 'Original TCT & DOAS in vault awaiting buyer';
    }

    if (stageStatus === 'Released') {
      const releaseEntry = activeTitle?.history?.find((h) => h.status === 'Released');
      return releaseEntry
        ? `Physical packet released on ${DATE_FORMAT.format(new Date(releaseEntry.changed_at))}`
        : 'Physical packet turned over to buyer';
    }

    return 'Workflow stage';
  }

  // Left Column Timeline navigation
  const timelineColumnContent = (
    <div className="space-y-3 pl-1">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Lifecycle Progress
        </span>
        {selectedStage !== currentStageStatus && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStage(currentStageStatus)}
            className="h-6 text-[11px] px-2 text-primary hover:text-primary gap-1"
          >
            <Target className="h-3 w-3" />
            Jump to Current
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        {timelineStages.map((stage, idx) => {
          const isCurrent = stage.status === currentStageStatus;
          const isSelected = stage.status === selectedStage;
          const isLast = idx === timelineStages.length - 1;
          const timestamp = getStageTimestamp(stage.status);
          const formattedTime = formatStageTime(timestamp);
          const dynamicDesc = getDynamicStageDescription(stage.status);

          return (
            <div key={stage.status} className="relative flex items-stretch gap-2 text-xs">
              <div className="flex flex-col items-center shrink-0 w-6">
                {isCurrent ? (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-[color-mix(in_srgb,var(--primary)_25%,transparent)] shadow-sm mt-2">
                    <Circle className="h-2 w-2 fill-primary-foreground" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center mt-2">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-card text-success ring-2 ring-[color-mix(in_srgb,var(--success)_30%,transparent)]">
                      <CheckCircle2 className="h-4 w-4 fill-success text-card" />
                    </div>
                  </div>
                )}
                {!isLast && <div className="w-[1.5px] flex-1 bg-border my-1" />}
              </div>

              <div className={`min-w-0 flex-1 ${!isLast ? 'pb-2' : 'pb-0'}`}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedStage(stage.status);
                    setMobileTab('content');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedStage(stage.status);
                      setMobileTab('content');
                    }
                  }}
                  className={`group w-full text-left transition-all rounded-lg p-2.5 cursor-pointer border ${
                    isSelected
                      ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] shadow-sm'
                      : 'border-transparent hover:bg-row-hover hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs truncate ${
                        isSelected ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                      }`}
                    >
                      {stage.label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {formattedTime && (
                        <span
                          className={`text-[10px] text-muted-foreground font-mono ${
                            isSelected ? 'hidden' : 'group-hover:hidden'
                          }`}
                        >
                          {formattedTime}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-medium transition-opacity ${
                          isSelected
                            ? 'opacity-100 text-primary font-semibold'
                            : 'opacity-0 group-hover:opacity-100 text-muted-foreground group-hover:text-primary'
                        }`}
                      >
                        View {stage.label}
                        <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-1">
                    {dynamicDesc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Intake Queue Overview View
  const intakeColumnContent = (
    <div className="space-y-5">
      <Alert variant="info">
        <Inbox className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Billing cleared this account as fully paid
          {activeAwaiting?.cleared_at ? (
            <>
              {' '}on{' '}
              <span className="font-semibold text-foreground">
                {DATE_FORMAT.format(new Date(activeAwaiting.cleared_at))}
              </span>
            </>
          ) : null}
          . {activeAwaiting ? 'Accept this account to start document preparation, or return it to billing if there is a discrepancy.' : 'Account intake completed.'}
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account Intake Overview
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Principal Buyer:</span>
            <p className="font-medium text-foreground">{clientName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Co-Buyers:</span>
            <p className="font-medium text-foreground">
              {activeAwaiting && activeAwaiting.co_buyers.length > 0
                ? activeAwaiting.co_buyers.join(', ')
                : 'None'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Property Lot:</span>
            <p className="font-medium text-foreground">{propertyRef}</p>
          </div>
          <div>
            <span className="text-muted-foreground">TCT Number on Lot:</span>
            <p className="font-mono text-foreground">
              {activeTitle?.property?.title_number ?? activeAwaiting?.property.title_number ?? 'Not yet recorded'}
            </p>
          </div>
        </div>
      </div>

      {activeAwaiting && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          {canEdit && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isReturningToBilling || isStartingProcessing}
              onClick={() => setConfirmReturnAccount(activeAwaiting)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Send back to Billing
            </Button>
          )}
          {canCreate && (
            <Button
              type="button"
              size="sm"
              className="gap-2 ml-auto"
              disabled={isStartingProcessing || isReturningToBilling}
              onClick={() => void handleStartLegalProcessing()}
            >
              {isStartingProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Start Legal Processing
            </Button>
          )}
        </div>
      )}
    </div>
  );

  function getNoticeTitle(num: number): string {
    if (num === 1) return '1st Notice';
    if (num === 2) return '2nd Notice';
    return 'Final Notice';
  }

  // Client Outreach & Notice Letters View (Ready for Claim)
  const noticesColumnContent = (() => {
    const sortedNotices = [...notices].sort((a, b) => a.notice_number - b.notice_number);
    const ongoingNotice = sortedNotices.find((n) => n.status === 'ongoing');
    const resolvedNotices = sortedNotices.filter((n) => n.status !== 'ongoing');
    const latestNotice = sortedNotices.length > 0 ? sortedNotices[sortedNotices.length - 1] : null;
    const latestNoticeNumber = latestNotice ? latestNotice.notice_number : 0;
    const nextNoticeNumber = (latestNoticeNumber + 1) as 1 | 2 | 3;

    return (
      <div className="space-y-4">
        {/* Ready for Claim Header & Turnover Release Button */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5 bg-card">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground">Client Outreach &amp; Notice Letters</span>
          </div>
          {activeTitle?.status === 'Ready for Claim' && canEdit && (
            <Button
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => setConfirmReleaseOpen(true)}
              className="text-xs gap-1.5 h-8 shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Record Release to Buyer
            </Button>
          )}
        </div>

        {/* Notices Stack in Single Column */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-0.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Notice Escalation
              {isLoadingNotices && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </h4>
            <span className="text-[11px] text-muted-foreground font-medium">
              {sortedNotices.length === 0
                ? 'Not started'
                : ongoingNotice
                ? `Notice ${ongoingNotice.notice_number} ongoing`
                : latestNoticeNumber === 3
                ? 'Cycle complete'
                : `Notice ${latestNoticeNumber} resolved`}
            </span>
          </div>

          {/* 1. All resolved notices rendered chronologically */}
          {resolvedNotices.map((n) => {
            const isReceived = n.status === 'received';
            const hasSubsequentNotice = sortedNotices.some(
              (other) => other.notice_number > n.notice_number
            );
            const nthLabel = n.notice_number === 1 ? '1st' : n.notice_number === 2 ? '2nd' : 'Final';
            const startedStr = formatStageTime(n.generated_at);
            const resolvedStr = formatStageTime(n.status_updated_at ?? n.updated_at);
            const noteText = n.tracking_number ?? n.rts_reason;

            return (
              <div
                key={n.notice_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card shadow-2xs"
              >
                {/* Left: Title, badge, and plain inline metadata */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {getNoticeTitle(n.notice_number)}
                    </span>
                    {isReceived ? (
                      <Badge variant="success" shape="pill" dot className="text-[10px]">
                        Received
                      </Badge>
                    ) : (
                      <Badge variant="warning" shape="pill" dot className="text-[10px]">
                        Returned to Sender
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Started {startedStr ?? DATE_FORMAT.format(new Date(n.generated_at))}</span>
                    <span>•</span>
                    <span className={isReceived ? 'text-success font-medium' : 'text-warning font-medium'}>
                      Marked {isReceived ? 'Received' : 'RTS'} {resolvedStr ?? DATE_FORMAT.format(new Date(n.status_updated_at ?? n.updated_at))}
                    </span>
                    {noteText && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-xs text-foreground font-mono">
                          {noteText}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Action buttons inline */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {n.rts_attachment_id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5 h-8"
                      onClick={() => void handleViewNoticeProof(n.rts_attachment_id!)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View {isReceived ? 'Waybill' : 'RTS Scan'}
                    </Button>
                  ) : null}

                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem
                          disabled={hasSubsequentNotice}
                          onClick={() => setConfirmUndoNotice(n.notice_number as 1 | 2 | 3)}
                          className="gap-2 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                          Undo this status
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleGenerateNotice(n.notice_number as 1 | 2 | 3)}
                          className="gap-2 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                          Generate {nthLabel} notice again
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}

          {/* 2. If there is an ONGOING notice: show Card 1 (ongoing) & Card 2 (update status) */}
          {ongoingNotice && (
            <>
              {/* Card 1: Ongoing notice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card shadow-2xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {getNoticeTitle(ongoingNotice.notice_number)}
                    </span>
                    <Badge variant="info" shape="pill" dot className="text-[10px]">
                      Ongoing
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Started {formatStageTime(ongoingNotice.generated_at) ?? DATE_FORMAT.format(new Date(ongoingNotice.generated_at))}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    className="text-xs gap-1.5 h-8"
                    disabled={isGeneratingNotice === ongoingNotice.notice_number}
                    onClick={() => void handleGenerateNotice(ongoingNotice.notice_number as 1 | 2 | 3)}
                  >
                    {isGeneratingNotice === ongoingNotice.notice_number ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Generate PDF
                  </Button>
                </div>
              </div>

              {/* Card 2: Option to provide status update to the ongoing notice */}
              {canEdit && (
                <div className="rounded-lg border border-dashed border-border p-2.5 bg-card flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xs">
                  <div className="w-full sm:w-44 shrink-0">
                    <Select
                      value={noticeStatusChoice}
                      onValueChange={(val) => {
                        setNoticeStatusChoice(val as 'received' | 'returned_to_sender');
                        setStatusFileInput(null);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received">Received (Waybill)</SelectItem>
                        <SelectItem value="returned_to_sender">Returned to Sender</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <input
                    ref={statusFileInputRef}
                    type="file"
                    accept={DOCUMENT_FILE_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setStatusFileInput(file);
                      e.target.value = '';
                    }}
                  />

                  {!statusFileInput ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => statusFileInputRef.current?.click()}
                      className="h-8 text-xs gap-1.5 shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload {noticeStatusChoice === 'received' ? 'Waybill' : 'RTS Scan'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-muted text-xs shrink-0 max-w-[200px]">
                      <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate text-foreground font-mono text-[11px]" title={statusFileInput.name}>
                        {statusFileInput.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setStatusFileInput(null)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded-xs"
                        title="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <Input
                    placeholder={
                      noticeStatusChoice === 'received'
                        ? 'Waybill # / Notes (Optional)'
                        : 'RTS Reason (Optional)'
                    }
                    value={statusNotesInput}
                    onChange={(e) => setStatusNotesInput(e.target.value)}
                    className="h-8 text-xs flex-1 min-w-[140px]"
                  />

                  <Button
                    size="sm"
                    disabled={!statusFileInput || isResolvingNotice}
                    onClick={() => void handleConfirmResolveNotice(ongoingNotice.notice_number as 1 | 2 | 3)}
                    className="h-8 text-xs gap-1.5 shrink-0"
                  >
                    {isResolvingNotice ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Save Status
                  </Button>
                </div>
              )}
            </>
          )}

          {/* 3. If there is NO ongoing notice: */}
          {!ongoingNotice && (
            <>
              {sortedNotices.length === 0 ? (
                /* Initial State: Single card with 'Start 1st Notice' */
                <div className="rounded-lg border border-dashed border-border p-3.5 bg-card flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">Start 1st Notice</span>
                    <Badge variant="muted" shape="pill" className="text-[10px]">
                      Pending
                    </Badge>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      className="text-xs gap-1.5 h-8 shrink-0"
                      onClick={() => setConfirmStartNotice(1)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Start 1st Notice
                    </Button>
                  )}
                </div>
              ) : latestNoticeNumber < 3 ? (
                /* Escalation State: Next notice start button card */
                canEdit && (
                  <div className="rounded-lg border border-dashed border-border p-3.5 bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Start {nextNoticeNumber === 2 ? '2nd' : 'Final'} Notice
                      </span>
                      <Badge variant="muted" shape="pill" className="text-[10px]">
                        Pending
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="text-xs gap-1.5 h-8 shrink-0"
                      onClick={() => setConfirmStartNotice(nextNoticeNumber)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Start {nextNoticeNumber === 2 ? '2nd' : 'Final'} Notice
                    </Button>
                  </div>
                )
              ) : (
                /* Final Notice Concluded: Static message card */
                <div className="rounded-lg border border-border p-3 bg-[color-mix(in_srgb,var(--card)_70%,var(--background))] flex items-center gap-2.5 text-xs text-muted-foreground">
                  <ShieldAlert className="h-4 w-4 text-warning shrink-0" />
                  <span>Notice cycle concluded. Title packet queued for legal counsel referral.</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  })();

  // Released / Finalized Turnover View
  const releasedColumnContent = (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-lg border border-border p-4 bg-card text-success">
        <CheckCircle2 className="h-6 w-6 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-foreground">Finalized &amp; Turned Over to Buyer</h4>
          <p className="text-xs text-muted-foreground">
            Original Transfer Certificate of Title (TCT) and notarized Deed of Absolute Sale (DOAS) have been formally handed over to the client.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Turnover Summary
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Client:</span>
            <p className="font-medium text-foreground">{clientName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Property Lot:</span>
            <p className="font-medium text-foreground">{propertyRef}</p>
          </div>
          <div>
            <span className="text-muted-foreground">TCT Number:</span>
            <p className="font-mono text-foreground">{activeTitle?.property?.title_number ?? 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Location:</span>
            <p className="font-medium text-foreground">{propertyLocation}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Release Packet & Clearance Workflow View (Doc Prep, Review, Signature, Clearance)
  const packetColumnContent = (
    <div className="space-y-5">
      {activeTitle && (
        <>
          {/* Stage action controls at the top */}
          {activeTitle.status === 'Cleared by Billing' && canEdit && (
            <div className="rounded-lg border border-border p-3.5 bg-card">
              <Button
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => void handleStatusChange('Document Preparation')}
                className="w-full text-xs gap-1.5"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Begin Document Preparation
              </Button>
            </div>
          )}

          {activeTitle.status === 'Document Preparation' && (
            <div className="rounded-lg border border-border p-3.5 bg-card">
              {!packetIsComplete ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Upload required documents and enter TCT below to advance.
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-success flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Release packet complete
                  </span>
                  <Select
                    disabled={isUpdatingStatus || !canEdit}
                    value={activeTitle.status}
                    onValueChange={(val) => void handleStatusChange(val as TitleStatus)}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue placeholder="Advance stage..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Document Preparation">Document Preparation</SelectItem>
                      <SelectItem value="For Review">Submit for Review</SelectItem>
                      <SelectItem value="For Signature">Route for Signature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {(activeTitle.status === 'For Review' || activeTitle.status === 'For Signature') && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3.5 bg-card">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Workflow Stage:</span>
                <Select
                  disabled={isUpdatingStatus || !canEdit}
                  value={activeTitle.status}
                  onValueChange={(val) => void handleStatusChange(val as TitleStatus)}
                >
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Document Preparation">Document Preparation</SelectItem>
                    <SelectItem value="For Review">For Review</SelectItem>
                    <SelectItem value="For Signature">For Signature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeTitle.status === 'For Signature' && canEdit && (
                <Button
                  size="sm"
                  disabled={isUpdatingStatus}
                  onClick={() => void handleStatusChange('Clearance Period')}
                  className="text-xs gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Start 30-Day Clearance
                </Button>
              )}
            </div>
          )}

          {activeTitle.status === 'Clearance Period' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3.5 bg-card">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground">30-Day Clearance Period</span>
                <p className="text-xs text-muted-foreground">
                  {clearance.isComplete
                    ? 'Clearance period complete'
                    : clearance.targetDate
                    ? `Clears ${DATE_FORMAT.format(clearance.targetDate)} (${Math.max(0, clearance.daysRemaining)} days remaining)`
                    : 'Clearance period active'}
                </p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  disabled={isUpdatingStatus || (!clearance.isComplete && !isAdmin)}
                  onClick={() => void handleStatusChange('Ready for Claim')}
                  className="text-xs gap-1.5"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Mark Ready for Claim
                </Button>
              )}
            </div>
          )}

          {/* TCT Number Card */}
          <div className="rounded-lg border border-border p-3.5 bg-card">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  TCT Number on Lot Parcel
                </span>
                {!isEditingTct && activeTitle.property?.title_number ? (
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {activeTitle.property.title_number}
                  </p>
                ) : !isEditingTct ? (
                  <p className="text-xs text-warning font-medium">
                    No TCT recorded on lot (Required to submit for review)
                  </p>
                ) : null}
              </div>
              {canEdit && !isEditingTct && (
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={() => setIsEditingTct(true)}
                  className="gap-1 text-xs"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              )}
            </div>

            {isEditingTct && (
              <form onSubmit={handleSaveTct} className="mt-2 flex items-center gap-2">
                <Input
                  value={titleNumberInput}
                  onChange={(e) => setTitleNumberInput(e.target.value)}
                  placeholder="e.g. T-123456"
                  className="h-8 font-mono text-xs flex-1"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={isSavingTct || !titleNumberInput.trim()}
                >
                  {isSavingTct ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsEditingTct(false)}
                >
                  Cancel
                </Button>
              </form>
            )}
          </div>

          {/* Release Packet Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                Release Packet Documents
                {isLoadingDocs && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </h4>
              <span className="text-xs text-muted-foreground">
                {requiredDocs.length - missingDocs.length} of {requiredDocs.length} uploaded
              </span>
            </div>

            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {RELEASE_DOCUMENT_TYPES.map((type) => {
                const isSkipped = type === 'Deed of Sale' && activeTitle.is_legacy_transferred;
                const doc = latestDocsByType.get(type);
                const isBusy = busyDocType === type;

                return (
                  <div
                    key={type}
                    className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-row-hover transition-colors"
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
                          <p className="text-[11px] text-muted-foreground italic">
                            Omitted — Title already in client name
                          </p>
                        ) : doc ? (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {formatDocumentName(doc.file_path)} • {DATE_FORMAT.format(new Date(doc.uploaded_at))}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Required for turnover</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {doc && (
                        <>
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => void handleViewDoc(doc)}
                            title="View document"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="quiet"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]"
                              onClick={() => setDocToRemove(doc)}
                              title="Remove document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                      {!isSkipped && canEdit && (
                        <Button
                          type="button"
                          variant="quiet"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          disabled={isBusy}
                          onClick={() => pickFile(type)}
                        >
                          {isBusy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
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
        </>
      )}
    </div>
  );

  // Route active content based on selectedStage
  const activeContent = (() => {
    if (selectedStage === 'Cleared by Billing') {
      return intakeColumnContent;
    }
    if (selectedStage === 'Ready for Claim') {
      return noticesColumnContent;
    }
    if (selectedStage === 'Released') {
      return releasedColumnContent;
    }
    return packetColumnContent;
  })();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Badge
                variant={TITLE_STATUS_VARIANT[currentStageStatus] ?? 'muted'}
                shape="pill"
                dot
              >
                {currentStageStatus}
              </Badge>
              {activeTitle?.is_legacy_transferred && (
                <Badge variant="outline" className="text-[11px]">
                  Legacy Pre-Transferred
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl">
              {propertyRef} <span className="text-muted-foreground font-normal">• {propertyLocation}</span>
            </DialogTitle>
            <DialogDescription>
              {clientName}
            </DialogDescription>
          </DialogHeader>

          {/* Mobile Tab Switcher */}
          <div className="md:hidden pt-2">
            <Tabs
              value={mobileTab}
              onValueChange={(val) => setMobileTab(val as 'timeline' | 'content')}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="content">
                  {selectedStage === 'Ready for Claim'
                    ? 'Notices & Actions'
                    : selectedStage === 'Cleared by Billing'
                    ? 'Intake Details'
                    : 'Packet & Actions'}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="timeline" className="pt-4">
                {timelineColumnContent}
              </TabsContent>
              <TabsContent value="content" className="pt-4">
                {activeContent}
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop Two-Column Layout */}
          <div className="hidden md:grid md:grid-cols-12 gap-8 pt-4">
            <div className="md:col-span-5 lg:col-span-4 border-r border-border pr-6 lg:pr-8">
              {timelineColumnContent}
            </div>
            <div className="md:col-span-7 lg:col-span-8 pl-1 lg:pl-3">
              {activeContent}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept={DOCUMENT_FILE_ACCEPT}
        className="hidden"
        onChange={handleFileChosen}
      />

      {/* RTS Upload Dialog */}
      <Dialog
        open={rtsModalNotice !== null}
        onOpenChange={(isOpen) => !isOpen && setRtsModalNotice(null)}
      >
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Upload Return to Sender (RTS) Scan</DialogTitle>
            <DialogDescription className="text-xs">
              Upload courier or postal proof of non-delivery for Notice {rtsModalNotice}. This unlocks subsequent notice letters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">RTS Reason (Optional)</label>
              <Input
                placeholder="e.g. Unclaimed, Moved / Incomplete address, Refused to receive"
                value={rtsReasonInput}
                onChange={(e) => setRtsReasonInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Scan Document (PDF, JPEG, PNG)</label>
              <Input
                type="file"
                accept={DOCUMENT_FILE_ACCEPT}
                onChange={(e) => setRtsFileInput(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setRtsModalNotice(null)}
              disabled={isUploadingRts}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!rtsFileInput || isUploadingRts}
              onClick={() => void handleConfirmUploadRts()}
              className="text-xs gap-1.5"
            >
              {isUploadingRts ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload RTS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert to Remove Document */}
      <AlertDialog open={docToRemove !== null} onOpenChange={(open) => !open && setDocToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove document?</AlertDialogTitle>
            <AlertDialogDescription>
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

      {/* Confirmation Alert to Return Account to Billing */}
      <AlertDialog
        open={confirmReturnAccount !== null}
        onOpenChange={(open) => !open && setConfirmReturnAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return account to Billing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this account from Legal intake and return it to Billing as uncleared.
              Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmReturnToBilling()}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              Confirm Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Alert to Record Release to Buyer */}
      <AlertDialog open={confirmReleaseOpen} onOpenChange={setConfirmReleaseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Title Release to Buyer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to record the physical turnover of this title to the buyer?
              This marks the title packet as officially Released and concludes the titling workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmReleaseOpen(false);
                void handleStatusChange('Released');
              }}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              Confirm Release
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Alert to Start Notice */}
      <AlertDialog
        open={confirmStartNotice !== null}
        onOpenChange={(open) => !open && setConfirmStartNotice(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Start {confirmStartNotice === 1 ? '1st' : confirmStartNotice === 2 ? '2nd' : 'Final Demand'} Notice?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the title claim with the{' '}
              {confirmStartNotice === 1 ? 'first' : confirmStartNotice === 2 ? 'second' : 'final demand'}{' '}
              notice and start the outreach tracking cycle. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStartingNotice}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isStartingNotice}
              onClick={() => {
                if (confirmStartNotice) {
                  void handleConfirmStartNotice(confirmStartNotice);
                }
              }}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              {isStartingNotice ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Start Notice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Alert to Undo Notice Status */}
      <AlertDialog
        open={confirmUndoNotice !== null}
        onOpenChange={(open) => !open && setConfirmUndoNotice(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Notice {confirmUndoNotice} Status?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert Notice {confirmUndoNotice} status back to Ongoing and remove the uploaded proof document. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUndoingNotice}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUndoingNotice}
              onClick={() => {
                if (confirmUndoNotice) {
                  void handleConfirmUndoNotice(confirmUndoNotice);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              {isUndoingNotice ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Undo Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
