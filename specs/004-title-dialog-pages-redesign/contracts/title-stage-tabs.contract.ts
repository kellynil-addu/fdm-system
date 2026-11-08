import type { ClientDocument } from '@/lib/types/client';
import type { LandTitle, LandTitleNotice, TitleStatus } from '@/lib/types/title';
import type { TitleDialogItem } from '@/lib/hooks/use-land-titles';

/**
 * Stage 1: Account Intake Tab Component Contract
 * Rendered when stage is 'Cleared by Billing'.
 */
export interface TitleIntakeTabProps {
  /** Active dialog item (either an account awaiting intake or an existing title). */
  item: TitleDialogItem;
  /** Callback fired when legal processing is started and the LandTitle record is created. */
  onStartedProcessing?: (title: LandTitle) => void;
}

/**
 * Stage 2: Document Preparation, Supervisor Review & Executive Signature Tab Contract
 * Rendered when stage is 'Document Preparation', 'For Review', or 'For Signature'.
 */
export interface TitlePacketTabProps {
  /** The active LandTitle record. */
  title: LandTitle;
  /** List of uploaded release documents. */
  documents: ClientDocument[];
  /** State updater callback when documents are added or removed. */
  onDocumentsChange: (docs: ClientDocument[]) => void;
  /** Loading indicator during document fetch. */
  isLoadingDocs: boolean;
  /** Boolean state tracking executive management signature. */
  isExecutiveSigned: boolean;
  /** State updater for executive signature checkbox. */
  setIsExecutiveSigned: (val: boolean) => void;
  /** Callback fired to transition title status with optional audit reason. */
  onStatusChange: (nextStatus: TitleStatus, reason?: string) => void;
  /** Indicator for when a status update mutation is pending. */
  isUpdatingStatus: boolean;
}

/**
 * Stage 3: Internal 30-Day Clearance Period Tab Contract
 * Rendered when stage is 'Clearance Period'.
 */
export interface TitleClearanceTabProps {
  /** The active LandTitle record. */
  title: LandTitle;
  /** Callback to advance title to 'Ready for Claim'. */
  onStatusChange: (status: TitleStatus) => void;
  /** Indicator for when a status update mutation is pending. */
  isUpdatingStatus: boolean;
}

/**
 * Stage 4: Client Outreach, Notice Escalation & Turnover Tab Contract
 * Rendered when stage is 'Ready for Claim'.
 */
export interface TitleNoticesTabProps {
  /** The active LandTitle record. */
  title: LandTitle;
  /** Array of notice records for this title. */
  notices: LandTitleNotice[];
  /** State updater callback for notices array. */
  onNoticesChange: (notices: LandTitleNotice[]) => void;
  /** Loading indicator during notice fetch. */
  isLoadingNotices: boolean;
  /** Callback to update title status. */
  onStatusChange: (status: TitleStatus) => void;
  /** Indicator for when a status update mutation is pending. */
  isUpdatingStatus: boolean;
  /** Callback fired when buyer turnover is finalized. */
  onTitleReleased?: (updated: LandTitle) => void;
}

/**
 * Stage 5: Finalized Turnover Dossier Archive Tab Contract
 * Rendered when stage is 'Released'.
 */
export interface TitleReleasedTabProps {
  /** The released LandTitle record. */
  title: LandTitle;
}
