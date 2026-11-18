import { REQUIRED_CLIENT_DOCUMENTS, type DocType } from '@/lib/types/client';

export interface ReviewableClient {
  client_id: string;
  full_name: string;
  contact_info: { value: string }[];
  /** Client documents, read from `file_attachment` as `file_category`. */
  documents: { file_category: string }[];
}

export interface ClientFollowUp {
  clientId: string;
  name: string;
  missingDocuments: DocType[];
  missingContact: boolean;
}

/** Presence checks only: an existing contact is not proof it is current. */
export function reviewClientRecord(client: ReviewableClient): ClientFollowUp {
  const present = new Set(client.documents.map(doc => doc.file_category as DocType));
  return {
    clientId: client.client_id,
    name: client.full_name,
    missingDocuments: REQUIRED_CLIENT_DOCUMENTS.filter(type => !present.has(type)),
    missingContact: !client.contact_info.some(contact => contact.value.trim().length > 0),
  };
}
