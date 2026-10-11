import {
  RELEASE_DOCUMENT_TYPES,
  type ReleaseDocumentType,
} from '@/lib/types/title';

/**
 * The documents a title's release packet needs. The Deed of Sale is only
 * needed while the title is in FDM's name. A legacy pre-transferred title
 * already has the client's name on it, so the Deed of Sale is skipped.
 */
export function getRequiredReleaseDocuments(isLegacyTransferred?: boolean | null): ReleaseDocumentType[] {
  return RELEASE_DOCUMENT_TYPES.filter((type) => type !== 'Deed of Sale' || !isLegacyTransferred);
}

/** Required documents that have not been uploaded yet, in checklist order. */
export function getMissingReleaseDocuments(
  isLegacyTransferred: boolean | null | undefined,
  uploadedTypes: Iterable<string>
): ReleaseDocumentType[] {
  const uploaded = new Set(uploadedTypes);
  return getRequiredReleaseDocuments(isLegacyTransferred).filter((type) => !uploaded.has(type));
}

/**
 * Whether the packet is complete enough to go to Management. Checks both
 * the required documents and whether the lot has a registered TCT number.
 */
export function isReleasePacketComplete(
  isLegacyTransferred: boolean | null | undefined,
  uploadedTypes: Iterable<string>,
  hasTitleNumber?: boolean
): boolean {
  const docsComplete = getMissingReleaseDocuments(isLegacyTransferred, uploadedTypes).length === 0;
  return hasTitleNumber !== undefined ? docsComplete && Boolean(hasTitleNumber) : docsComplete;
}

/**
 * Which of a client's documents count toward one lot's release packet: those
 * linked to that lot, and those linked to no lot (uploaded for the client as a
 * whole, which includes every document from before lots could be chosen).
 */
export function documentsForLot<T extends { property_id?: string | null }>(
  documents: T[],
  propertyId: string
): T[] {
  return documents.filter((doc) => !doc.property_id || doc.property_id === propertyId);
}
