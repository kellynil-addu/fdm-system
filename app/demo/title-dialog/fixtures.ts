import type { UserSession } from '@/lib/types/session';
import type {
  AccountAwaitingTitle,
  LandTitle,
  LandTitleNotice,
  LandTitleStatusHistory,
  TitleStatus,
} from '@/lib/types/title';
import type { ClientDocument } from '@/lib/types/client';

/**
 * Fixtures for the title-dialog design preview.
 *
 * These are real `LandTitle` objects, not concept records. The tabs are real
 * components that call `useLandTitles()` and read every field below, so a
 * lighter mock would render a different DOM than the shipped dialog and every
 * measurement taken on it would be wrong — the first trap in the
 * `layout-verification` skill is precisely that a mock is not a reproduction.
 *
 * The records are chosen to reach every branch of the workflow rather than to
 * look representative: one per lifecycle stage, plus the two branch-heavy cases
 * (a notice cycle mid-escalation, and a record with nothing recorded at all).
 */

const DAY = 1000 * 60 * 60 * 24;

/** An ISO timestamp `days` in the past, so the relative copy stays sensible. */
function daysAgo(days: number, hour = 9): string {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function history(titleId: string, entries: [TitleStatus, number][]): LandTitleStatusHistory[] {
  return entries.map(([status, days], index) => ({
    history_id: `${titleId}-h${index}`,
    title_id: titleId,
    status,
    changed_at: daysAgo(days),
    changed_by: null,
  }));
}

const CONTACTS = [
  {
    contact_id: 'ct-1',
    client_id: 'client-1',
    type: 'Mobile',
    value: '+63 917 555 0144',
    is_primary: true,
    last_updated: daysAgo(30),
  },
  {
    contact_id: 'ct-2',
    client_id: 'client-1',
    type: 'Email',
    value: 'r.dela.cruz@example.com',
    is_primary: false,
    last_updated: daysAgo(30),
  },
];

function notice(
  titleId: string,
  noticeNumber: 1 | 2 | 3,
  status: LandTitleNotice['status'],
  generatedDaysAgo: number,
  resolvedDaysAgo?: number,
  trackingNumber?: string
): LandTitleNotice {
  return {
    notice_id: `${titleId}-n${noticeNumber}`,
    title_id: titleId,
    notice_number: noticeNumber,
    status,
    status_updated_at: resolvedDaysAgo === undefined ? undefined : daysAgo(resolvedDaysAgo),
    tracking_number: trackingNumber,
    generated_at: daysAgo(generatedDaysAgo),
    generated_by: null,
    rts_attachment_id: status === 'returned_to_sender' ? `${titleId}-rts${noticeNumber}` : null,
    rts_attachment:
      status === 'returned_to_sender'
        ? {
            attachment_id: `${titleId}-rts${noticeNumber}`,
            entity_type: 'land_title_notice',
            entity_id: `${titleId}-n${noticeNumber}`,
            file_category: 'notice_rts',
            file_path: `titles/${titleId}/rts-scan-${noticeNumber}.pdf`,
            file_name: `RTS scan - notice ${noticeNumber}.pdf`,
            file_size: 284_512,
            mime_type: 'application/pdf',
            metadata: {},
            uploaded_at: daysAgo((resolvedDaysAgo ?? generatedDaysAgo) - 1),
            uploaded_by: null,
          }
        : null,
    rts_reason: status === 'returned_to_sender' ? 'Unclaimed — addressee not at residence' : null,
    created_at: daysAgo(generatedDaysAgo),
    updated_at: daysAgo(resolvedDaysAgo ?? generatedDaysAgo),
  };
}

// ---------------------------------------------------------------------------
// F1 — an account billing has cleared but Legal has not yet accepted
// ---------------------------------------------------------------------------

export const AWAITING_ACCOUNT: AccountAwaitingTitle = {
  account_id: 'acct-1',
  cleared_at: daysAgo(3, 14),
  property: {
    property_id: 'prop-1',
    location: 'Brgy. Talomo, Davao City',
    block_number: 104,
    lot_number: 127,
    title_number: 'T-121212121',
    status: 'Sold',
    area_size: 150,
  },
  client: {
    client_id: 'client-1',
    full_name: 'Ricardo Dela Cruz',
    address: '12 Rizal Street, Brgy. Talomo, Davao City',
    contact_info: CONTACTS,
  },
  co_buyers: ['Maria Dela Cruz', 'Jose Dela Cruz'],
};

// ---------------------------------------------------------------------------
// F2 — cleared by billing, no title number on the lot yet
// ---------------------------------------------------------------------------

const F2: LandTitle = {
  title_id: 'title-f2',
  property_id: 'prop-2',
  client_id: 'client-2',
  status: 'Cleared by Billing',
  is_legacy_transferred: false,
  created_by: null,
  created_at: daysAgo(2),
  updated_at: daysAgo(2),
  client: {
    client_id: 'client-2',
    full_name: 'Anita Villanueva',
    status: 'Active',
    address: '88 Mabini Extension, Brgy. Matina, Davao City',
    civil_status: 'Married',
    spouse_name: 'Eduardo Villanueva',
    tin_number: '123-456-789',
    contact_info: CONTACTS,
  },
  property: {
    property_id: 'prop-2',
    location: 'Brgy. Matina, Davao City',
    block_number: 14,
    lot_number: 27,
    title_number: null,
    area_size: 200,
    price_per_sqm: 5200,
    status: 'Sold',
  },
  history: history('title-f2', [['Cleared by Billing', 2]]),
  notices: [],
};

// ---------------------------------------------------------------------------
// F3 — mid document preparation: four of six files, title number recorded
// ---------------------------------------------------------------------------

export const F3_DOCUMENTS: ClientDocument[] = [
  {
    document_id: 'doc-1',
    client_id: 'client-3',
    property_id: 'prop-3',
    document_type: 'SOA',
    file_path: 'clients/client-3/soa.pdf',
    uploaded_at: daysAgo(6),
    uploaded_by: null,
  },
  {
    document_id: 'doc-2',
    client_id: 'client-3',
    property_id: 'prop-3',
    document_type: 'Payment History',
    file_path: 'clients/client-3/payment-history.pdf',
    uploaded_at: daysAgo(6),
    uploaded_by: null,
  },
  {
    document_id: 'doc-3',
    client_id: 'client-3',
    property_id: 'prop-3',
    document_type: 'Certificate of Ownership',
    file_path: 'clients/client-3/certificate-of-ownership.pdf',
    uploaded_at: daysAgo(5),
    uploaded_by: null,
  },
  {
    document_id: 'doc-4',
    client_id: 'client-3',
    property_id: 'prop-3',
    document_type: 'Title Copy',
    file_path: 'clients/client-3/title-copy.pdf',
    uploaded_at: daysAgo(4),
    uploaded_by: null,
  },
];

const F3: LandTitle = {
  title_id: 'title-f3',
  property_id: 'prop-3',
  client_id: 'client-3',
  status: 'Document Preparation',
  is_legacy_transferred: false,
  created_by: null,
  created_at: daysAgo(12),
  updated_at: daysAgo(4),
  client: {
    client_id: 'client-3',
    full_name: 'Benjamin Ocampo',
    status: 'Active',
    address: 'Lot 4, Phase 2, Ciudad de Calinan, Calinan, Davao City',
    civil_status: 'Single',
    tin_number: '987-654-321',
    contact_info: CONTACTS,
    documents: F3_DOCUMENTS.map((doc) => ({
      document_type: doc.document_type,
      property_id: doc.property_id,
    })),
  },
  property: {
    property_id: 'prop-3',
    location: 'Ciudad de Calinan, Davao City',
    block_number: 7,
    lot_number: 12,
    title_number: 'T-4455667',
    area_size: 180,
    price_per_sqm: 6100,
    status: 'Sold',
  },
  history: history('title-f3', [
    ['Cleared by Billing', 12],
    ['Document Preparation', 12],
  ]),
  notices: [],
};

// ---------------------------------------------------------------------------
// F4 — submitted and waiting on the legal supervisor
// ---------------------------------------------------------------------------

const F4: LandTitle = {
  ...F3,
  title_id: 'title-f4',
  status: 'For Review',
  updated_at: daysAgo(2),
  history: history('title-f4', [
    ['Cleared by Billing', 20],
    ['Document Preparation', 20],
    ['For Review', 2],
  ]),
};

// ---------------------------------------------------------------------------
// F5 — approved by the supervisor, awaiting the executive signature
// ---------------------------------------------------------------------------

const F5: LandTitle = {
  ...F3,
  title_id: 'title-f5',
  status: 'For Signature',
  updated_at: daysAgo(1),
  history: history('title-f5', [
    ['Cleared by Billing', 24],
    ['Document Preparation', 24],
    ['For Review', 6],
    ['For Signature', 1],
  ]),
};

// ---------------------------------------------------------------------------
// F6 — eight days left in the thirty-day clearance window
// ---------------------------------------------------------------------------

const F6: LandTitle = {
  ...F3,
  title_id: 'title-f6',
  status: 'Clearance Period',
  clearance_started_at: daysAgo(22),
  updated_at: daysAgo(22),
  history: history('title-f6', [
    ['Cleared by Billing', 40],
    ['Document Preparation', 40],
    ['For Review', 30],
    ['For Signature', 25],
    ['Clearance Period', 22],
  ]),
};

// ---------------------------------------------------------------------------
// F7 — claim notices under way, storage fee accruing
// ---------------------------------------------------------------------------

const F7: LandTitle = {
  ...F3,
  title_id: 'title-f7',
  status: 'Ready for Claim',
  clearance_started_at: daysAgo(52),
  updated_at: daysAgo(9),
  history: history('title-f7', [
    ['Cleared by Billing', 460],
    ['Document Preparation', 460],
    ['For Review', 450],
    ['For Signature', 440],
    ['Clearance Period', 430],
    // Past the one-year grace period, so the storage fee is genuinely overdue
    // rather than being forced by a fixture flag.
    ['Ready for Claim', 400],
  ]),
  notices: [
    notice('title-f7', 1, 'returned_to_sender', 120, 111, 'LBC-8891234'),
    notice('title-f7', 2, 'ongoing', 9),
  ],
};

// ---------------------------------------------------------------------------
// F8 — ready for claim, still inside the grace period, no notices sent
// ---------------------------------------------------------------------------

const F8: LandTitle = {
  ...F3,
  title_id: 'title-f8',
  status: 'Ready for Claim',
  clearance_started_at: daysAgo(70),
  updated_at: daysAgo(40),
  history: history('title-f8', [
    ['Cleared by Billing', 100],
    ['Document Preparation', 100],
    ['For Review', 90],
    ['For Signature', 85],
    ['Clearance Period', 80],
    ['Ready for Claim', 40],
  ]),
  notices: [],
};

// ---------------------------------------------------------------------------
// F9 — released to a representative, pre-transferred legacy title
// ---------------------------------------------------------------------------

const F9: LandTitle = {
  ...F3,
  title_id: 'title-f9',
  status: 'Released',
  is_legacy_transferred: true,
  clearance_started_at: daysAgo(120),
  released_at: daysAgo(10, 15),
  released_to_name: 'Josefina Ocampo',
  released_to_id: 'PSN-04-1234567-8',
  release_remarks:
    'Claimed by the buyer’s sister under a notarised special power of attorney. Signed clearance copy scanned and filed.',
  release_attachment_id: 'att-1',
  release_attachment: {
    attachment_id: 'att-1',
    entity_type: 'land_title',
    entity_id: 'title-f9',
    file_category: 'release_acknowledgment',
    file_path: 'titles/title-f9/signed-clearance.pdf',
    file_name: 'signed-clearance-ocampo.pdf',
    file_size: 412_880,
    mime_type: 'application/pdf',
    metadata: {},
    uploaded_at: daysAgo(10, 15),
    uploaded_by: null,
  },
  updated_at: daysAgo(10, 15),
  history: history('title-f9', [
    ['Cleared by Billing', 200],
    ['Document Preparation', 200],
    ['For Review', 180],
    ['For Signature', 170],
    ['Clearance Period', 160],
    ['Ready for Claim', 130],
    ['Released', 10],
  ]),
  notices: [notice('title-f9', 1, 'received', 60, 52, 'LBC-7712009')],
};

// ---------------------------------------------------------------------------
// F10 — the worst case: released, and nothing about the record is on file
// ---------------------------------------------------------------------------

const F10: LandTitle = {
  title_id: 'title-f10',
  property_id: 'prop-10',
  client_id: 'client-10',
  status: 'Released',
  is_legacy_transferred: false,
  created_by: null,
  created_at: daysAgo(300),
  updated_at: daysAgo(300),
  history: history('title-f10', [
    ['Cleared by Billing', 300],
    ['Document Preparation', 300],
    ['Released', 300],
  ]),
  notices: [],
};

export const FIXTURE_TITLES: LandTitle[] = [F2, F3, F4, F5, F6, F7, F8, F9, F10];
export const FIXTURE_AWAITING: AccountAwaitingTitle[] = [AWAITING_ACCOUNT];

/** The record each fixture is meant to exercise, for the picker. */
export const FIXTURE_LABELS: Record<string, string> = {
  'title-f2': 'Cleared by Billing — no title number',
  'title-f3': 'Document Preparation — 4 of 6 files',
  'title-f4': 'For Review — supervisor queue',
  'title-f5': 'For Signature — awaiting executive',
  'title-f6': 'Clearance Period — 8 days left',
  'title-f7': 'Ready for Claim — notices out, fee overdue',
  'title-f8': 'Ready for Claim — in grace, no notices',
  'title-f9': 'Released — representative, legacy title',
  'title-f10': 'Released — stress case, nothing on file',
};

/**
 * A session that unlocks every permission the dialog checks, so all five Stage
 * Management branches render in the preview.
 */
export const FIXTURE_SESSION: UserSession = {
  user: { id: 'demo-user', email: 'preview@example.com' },
  roles: ['System Administrator'],
  permissions: ['legal.read', 'legal.create', 'legal.update', 'system.update', 'system.create'],
  isSystemAdmin: true,
};
