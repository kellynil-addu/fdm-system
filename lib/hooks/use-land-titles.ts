'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStatusFilter } from '@/lib/hooks/use-status-filter';
import { undoBillingClearance } from '@/lib/actions/billing';
import {
  createLandTitle,
  updateLandTitle,
  updatePropertyTitleNumber,
} from '@/lib/actions/titles';
import {
  deleteReleaseDocument,
  getReleaseDocumentUrl,
  getReleaseDocuments,
  uploadReleaseDocument,
} from '@/lib/actions/release-documents';
import {
  getTitleNotices,
  recordTitleNotice,
  resolveTitleNotice,
  uploadTitleNoticeRts,
  getTitleNoticeRtsUrl,
  deleteTitleNoticeRts,
} from '@/lib/actions/title-notices';
import type { ActionResult } from '@/lib/actions/action-result';
import type {
  AccountAwaitingTitle,
  LandTitle,
  LandTitleNotice,
  ReleaseDocumentType,
  TitleStatus,
} from '@/lib/types/title';
import type { ClientDocument } from '@/lib/types/client';
import type { LedgerAccount } from '@/lib/types/property';

export type LegalTab =
  | 'unselected'
  | 'intake'
  | 'preparation'
  | 'review'
  | 'clearance'
  | 'ready'
  | 'released'
  | 'all';

const TABS: LegalTab[] = [
  'unselected',
  'intake',
  'preparation',
  'review',
  'clearance',
  'ready',
  'released',
  'all',
];

type LotRef = { block_number: number; lot_number: number } | null | undefined;

/** Lot identity as staff say it out loud: "Block 3 Lot 12". */
export function lotRefLabel(lot: LotRef): string {
  return lot ? `Block ${lot.block_number} Lot ${lot.lot_number}` : 'Lot not found';
}

function matchesSearch(fields: string[], query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.map((field) => field.toLowerCase());
  return words.every((word) => haystack.some((field) => field.includes(word)));
}

/** Sole owner of the land title server actions for the Legal page. */
export function useLandTitles(initialTitles: LandTitle[], initialAwaiting: AccountAwaitingTitle[]) {
  const router = useRouter();
  const [titles, setTitles] = useState(initialTitles);
  const [awaiting, setAwaiting] = useState(initialAwaiting);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useStatusFilter<LegalTab>(TABS, 'unselected');

  useEffect(() => setTitles(initialTitles), [initialTitles]);
  useEffect(() => setAwaiting(initialAwaiting), [initialAwaiting]);

  const counts = useMemo(
    () => ({
      all: awaiting.length + titles.length,
      intake: awaiting.length,
      preparation: titles.filter((t) => t.status === 'Document Preparation').length,
      review: titles.filter((t) => t.status === 'For Review' || t.status === 'For Signature').length,
      clearance: titles.filter((t) => t.status === 'Clearance Period').length,
      ready: titles.filter((t) => t.status === 'Ready for Claim').length,
      released: titles.filter((t) => t.status === 'Released').length,
    }),
    [awaiting, titles]
  );

  const visibleAwaiting = useMemo(
    () =>
      awaiting.filter((account) =>
        matchesSearch(
          [
            account.client?.full_name ?? '',
            ...account.co_buyers,
            account.property.location,
            account.property.title_number ?? '',
            lotRefLabel(account.property),
          ],
          search
        )
      ),
    [awaiting, search]
  );

  const visibleTitles = useMemo(
    () =>
      titles.filter((title) =>
        matchesSearch(
          [
            title.client?.full_name ?? '',
            title.property?.title_number ?? '',
            title.property?.location ?? '',
            lotRefLabel(title.property),
          ],
          search
        )
      ),
    [titles, search]
  );

  const filteredAwaiting = useMemo(() => {
    if (tab === 'unselected') return [];
    if (tab === 'all' || tab === 'intake') return visibleAwaiting;
    return [];
  }, [tab, visibleAwaiting]);

  const filteredTitles = useMemo(() => {
    switch (tab) {
      case 'unselected':
        return [];
      case 'all':
        return visibleTitles;
      case 'intake':
        return [];
      case 'preparation':
        return visibleTitles.filter((t) => t.status === 'Document Preparation');
      case 'review':
        return visibleTitles.filter(
          (t) => t.status === 'For Review' || t.status === 'For Signature'
        );
      case 'clearance':
        return visibleTitles.filter((t) => t.status === 'Clearance Period');
      case 'ready':
        return visibleTitles.filter((t) => t.status === 'Ready for Claim');
      case 'released':
        return visibleTitles.filter((t) => t.status === 'Released');
      default:
        return [];
    }
  }, [tab, visibleTitles]);

  const createTitle = useCallback(
    async (
      propertyId: string,
      options?: { is_legacy_transferred?: boolean; status?: TitleStatus }
    ): Promise<ActionResult<LandTitle>> => {
      const result = await createLandTitle({
        property_id: propertyId,
        is_legacy_transferred: options?.is_legacy_transferred,
        status: options?.status,
      });
      if (result.success) {
        setAwaiting((prev) => prev.filter((a) => a.property.property_id !== propertyId));
        setTitles((prev) => [result.data, ...prev]);
        router.refresh();
      }
      return result;
    },
    [router]
  );

  const updateTitle = useCallback(
    async (
      titleId: string,
      updates: { is_legacy_transferred?: boolean; status?: TitleStatus; clearance_started_at?: string | null }
    ): Promise<ActionResult<LandTitle>> => {
      const result = await updateLandTitle(titleId, updates);
      if (result.success) {
        setTitles((prev) => prev.map((t) => (t.title_id === titleId ? result.data : t)));
        router.refresh();
      }
      return result;
    },
    [router]
  );

  const revertClearance = useCallback(
    async (accountId: string): Promise<ActionResult<LedgerAccount>> => {
      const result = await undoBillingClearance(accountId);
      if (result.success) {
        setAwaiting((prev) => prev.filter((a) => a.account_id !== accountId));
        router.refresh();
      }
      return result;
    },
    [router]
  );

  const updateTitleNumber = useCallback(
    async (propertyId: string, titleNumber: string): Promise<void> => {
      const result = await updatePropertyTitleNumber(propertyId, titleNumber);
      if (!result.success) throw new Error(result.error);
      setTitles((prev) =>
        prev.map((t) =>
          t.property_id === propertyId && t.property
            ? { ...t, property: { ...t.property, title_number: titleNumber } }
            : t
        )
      );
      router.refresh();
    },
    [router]
  );

  const loadDocuments = useCallback((titleId: string) => getReleaseDocuments(titleId), []);

  const uploadDocument = useCallback(
    async (titleId: string, documentType: ReleaseDocumentType, file: File): Promise<ClientDocument> => {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('document_type', documentType);

      const result = await uploadReleaseDocument(titleId, formData);
      if (!result.success) throw new Error(result.error);

      router.refresh();
      return result.data;
    },
    [router]
  );

  const removeDocument = useCallback(
    async (document: ClientDocument): Promise<void> => {
      const result = await deleteReleaseDocument(document.document_id);
      if (!result.success) throw new Error(result.error);

      router.refresh();
    },
    [router]
  );

  const getDocumentUrl = useCallback((documentId: string) => getReleaseDocumentUrl(documentId), []);

  const loadNotices = useCallback((titleId: string) => getTitleNotices(titleId), []);

  const recordNotice = useCallback(
    async (titleId: string, noticeNumber: number): Promise<LandTitleNotice> => {
      const result = await recordTitleNotice({ titleId, notice_number: noticeNumber });
      if (!result.success) throw new Error(result.error);
      router.refresh();
      return result.data;
    },
    [router]
  );

  const resolveNotice = useCallback(
    async (
      titleId: string,
      noticeNumber: number,
      status: 'received' | 'returned_to_sender',
      file: File,
      notes?: string | null
    ): Promise<LandTitleNotice> => {
      const formData = new FormData();
      formData.set('status', status);
      formData.set('file', file);
      if (notes) formData.set('notes', notes);

      const result = await resolveTitleNotice(titleId, noticeNumber, formData);
      if (!result.success) throw new Error(result.error);
      router.refresh();
      return result.data;
    },
    [router]
  );

  const undoNoticeStatus = useCallback(
    async (titleId: string, noticeNumber: number): Promise<void> => {
      const result = await deleteTitleNoticeRts(titleId, noticeNumber);
      if (!result.success) throw new Error(result.error);
      router.refresh();
    },
    [router]
  );

  const uploadNoticeRts = useCallback(
    async (
      titleId: string,
      noticeNumber: number,
      file: File,
      reason?: string | null
    ): Promise<LandTitleNotice> => {
      const formData = new FormData();
      formData.set('file', file);
      if (reason) formData.set('rts_reason', reason);

      const result = await uploadTitleNoticeRts(titleId, noticeNumber, formData);
      if (!result.success) throw new Error(result.error);
      router.refresh();
      return result.data;
    },
    [router]
  );

  const getNoticeRtsUrl = useCallback(
    (attachmentId: string) => getTitleNoticeRtsUrl(attachmentId),
    []
  );

  const getNoticeProofUrl = getNoticeRtsUrl;

  const deleteNoticeRts = useCallback(
    async (titleId: string, noticeNumber: number): Promise<void> => {
      const result = await deleteTitleNoticeRts(titleId, noticeNumber);
      if (!result.success) throw new Error(result.error);
      router.refresh();
    },
    [router]
  );

  return {
    titles,
    awaiting,
    counts,
    visibleTitles,
    visibleAwaiting,
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
  };
}
