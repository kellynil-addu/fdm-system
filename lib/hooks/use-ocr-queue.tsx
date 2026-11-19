'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { indexAttachmentWithPaddle } from '@/lib/actions/ocr-paddle';
import type { IndexableEntity, UnindexedDocument } from '@/lib/types/search';

export interface OcrJob {
  id: string;
  attachmentId: string;
  file?: File;
  fileName: string;
  entityType: IndexableEntity;
  keywords?: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  progress: number;
  page?: number;
  totalPages?: number;
  error?: string;
}

export interface EnqueueFileParams {
  attachmentId: string;
  file?: File;
  fileName?: string;
  entityType?: IndexableEntity;
  keywords?: string;
}

interface OcrQueueContextValue {
  jobs: OcrJob[];
  activeJob: OcrJob | null;
  pendingCount: number;
  completedCount: number;
  isProcessing: boolean;
  enqueueFile: (params: EnqueueFileParams) => void;
  enqueueRemoteAttachment: (attachment: UnindexedDocument) => Promise<void>;
  clearCompleted: () => void;
}

const OcrQueueContext = createContext<OcrQueueContextValue | null>(null);

export function OcrQueueProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<OcrJob[]>([]);
  const isWorkingRef = useRef(false);

  const isProcessing = jobs.some((j) => j.status === 'pending' || j.status === 'processing');

  useEffect(() => {
    if (!isProcessing) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing]);

  // Processes the next pending OCR job using server-side PaddleOCR
  const processNextJob = useCallback(async () => {
    if (isWorkingRef.current) return;

    const nextJob = jobs.find((j) => j.status === 'pending');
    if (!nextJob) return;

    isWorkingRef.current = true;
    setJobs((prev) =>
      prev.map((j) => (j.id === nextJob.id ? { ...j, status: 'processing', progress: 0 } : j))
    );

    try {
      const formData = new FormData();
      formData.append('attachmentId', nextJob.attachmentId);
      if (nextJob.file) {
        formData.append('file', nextJob.file);
      }
      formData.append('entityType', nextJob.entityType);
      if (nextJob.keywords) {
        formData.append('keywords', nextJob.keywords);
      }

      const res = await indexAttachmentWithPaddle(formData);
      if (!res.success) {
        throw new Error(res.error || 'PaddleOCR indexing failed');
      }

      setJobs((prev) =>
        prev.map((j) =>
          j.id === nextJob.id
            ? { ...j, status: 'done', progress: 1, totalPages: res.data.totalPages }
            : j
        )
      );
    } catch (err) {
      console.warn(`PaddleOCR indexing failed for ${nextJob.fileName}:`, err);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === nextJob.id
            ? {
                ...j,
                status: 'failed',
                error: err instanceof Error ? err.message : 'Indexing failed',
              }
            : j
        )
      );
    } finally {
      isWorkingRef.current = false;
    }
  }, [jobs]);

  useEffect(() => {
    void processNextJob();
  }, [processNextJob]);

  const enqueueFile = useCallback(
    ({
      attachmentId,
      file,
      fileName,
      entityType = 'client_document',
      keywords,
    }: EnqueueFileParams) => {
      const resolvedName = fileName ?? file?.name ?? 'document';
      const newJob: OcrJob = {
        id: `${attachmentId}-${Date.now()}`,
        attachmentId,
        file,
        fileName: resolvedName,
        entityType,
        keywords,
        status: 'pending',
        progress: 0,
      };

      setJobs((prev) => {
        if (prev.some((j) => j.attachmentId === attachmentId && j.status !== 'failed')) {
          return prev;
        }
        return [...prev, newJob];
      });
    },
    []
  );

  const enqueueRemoteAttachment = useCallback(
    async (attachment: UnindexedDocument) => {
      enqueueFile({
        attachmentId: attachment.attachment_id,
        fileName: attachment.file_name,
        entityType: (attachment.entity_type as IndexableEntity) || 'client_document',
        keywords: [attachment.file_category, attachment.client_name].filter(Boolean).join(' '),
      });
    },
    [enqueueFile]
  );

  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status === 'pending' || j.status === 'processing'));
  }, []);

  const activeJob = jobs.find((j) => j.status === 'processing') ?? null;
  const pendingCount = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'processing'
  ).length;
  const completedCount = jobs.filter((j) => j.status === 'done').length;

  return (
    <OcrQueueContext.Provider
      value={{
        jobs,
        activeJob,
        pendingCount,
        completedCount,
        isProcessing,
        enqueueFile,
        enqueueRemoteAttachment,
        clearCompleted,
      }}
    >
      {children}
    </OcrQueueContext.Provider>
  );
}

export function useOcrQueue(): OcrQueueContextValue {
  const context = useContext(OcrQueueContext);
  if (!context) {
    throw new Error('useOcrQueue must be used within an OcrQueueProvider');
  }
  return context;
}
