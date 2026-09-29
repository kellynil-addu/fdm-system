"use server";

import { PERMISSIONS } from "@/lib/permissions";
import { createAction, createQuery } from "@/lib/actions/action-handler";
import { createClientSchema, updateClientSchema } from "@/lib/validations/client";
import type {
  Client,
  ClientListItem,
  ClientWithDetails,
  ContactInfo,
  ClientDocument,
  ClientLog,
  DocType,
  CreateClientInput,
  CreateContactInfoInput,
  UpdateContactInfoInput,
  CreateClientDocumentInput,
  CreateClientLogInput,
  ClientInteractionInput,
  ClientDocumentChecklist,
  ClientDocumentNotification,
  GetClientsParams,
  PaginatedResult,
} from "@/lib/types/client";

import * as clientService from "@/lib/services/client/client-service";
import * as contactService from "@/lib/services/client/contact-service";
import * as documentService from "@/lib/services/client/document-service";
import * as logService from "@/lib/services/client/log-service";

export const getClients = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, params?: GetClientsParams): Promise<PaginatedResult<ClientListItem>> => {
    return clientService.getClients(ctx.supabase, params);
  },
});

export const getClientById = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, clientId: string): Promise<ClientWithDetails> => {
    return clientService.getClientById(ctx.supabase, clientId);
  },
});

export const createClient = createAction({
  permission: PERMISSIONS.CLIENTS.CREATE,
  handler: async (ctx, input: unknown): Promise<Client> => {
    const validated = createClientSchema.parse(input);
    const rawInput = input as CreateClientInput;
    return clientService.createClient(ctx.supabase, {
      ...validated,
      contacts: rawInput?.contacts,
    });
  },
});

export const updateClient = createAction({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, clientId: string, input: unknown): Promise<Client> => {
    const validated = updateClientSchema.parse(input);
    return clientService.updateClient(ctx.supabase, clientId, validated);
  },
});

export const archiveClient = createAction({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, clientId: string): Promise<Client> => {
    return clientService.archiveClient(ctx.supabase, clientId);
  },
});

export const unarchiveClient = createAction({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, clientId: string): Promise<Client> => {
    return clientService.unarchiveClient(ctx.supabase, clientId);
  },
});

export async function getArchivedClients(
  params?: GetClientsParams
): Promise<PaginatedResult<ClientListItem>> {
  return getClients({
    ...params,
    status: "Archived",
    includeArchived: true,
  });
}

export const deleteClient = createAction({
  permission: PERMISSIONS.CLIENTS.DELETE,
  handler: async (ctx, clientId: string): Promise<void> => {
    return clientService.deleteClient(ctx.supabase, clientId);
  },
});

export const addContactInfo = createAction({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, clientId: string, input: CreateContactInfoInput): Promise<ContactInfo> => {
    return contactService.addContactInfo(ctx.supabase, clientId, input);
  },
});

export const getClientContacts = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, clientId: string): Promise<ContactInfo[]> => {
    return contactService.getClientContacts(ctx.supabase, clientId);
  },
});

export const updateContactInfo = createAction({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, contactId: string, input: UpdateContactInfoInput): Promise<ContactInfo> => {
    return contactService.updateContactInfo(ctx.supabase, contactId, input);
  },
});

export const deleteContactInfo = createAction({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, contactId: string): Promise<void> => {
    return contactService.deleteContactInfo(ctx.supabase, contactId);
  },
});

export const uploadClientDocument = createAction({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, clientId: string, formData: FormData): Promise<ClientDocument> => {
    return documentService.uploadClientDocument(ctx.supabase, clientId, formData, ctx.userId);
  },
});

export const getClientDocumentUrl = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, documentId: string): Promise<string> => {
    return documentService.getClientDocumentUrl(ctx.supabase, documentId);
  },
});

export const createClientDocument = createQuery({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (
    ctx,
    clientId: string,
    input: CreateClientDocumentInput
  ): Promise<ClientDocument> => {
    return documentService.createClientDocument(ctx.supabase, clientId, input, ctx.userId!);
  },
});

export const getClientDocuments = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (
    ctx,
    clientId: string,
    params?: { category?: DocType }
  ): Promise<ClientDocument[]> => {
    return documentService.getClientDocuments(ctx.supabase, clientId, params);
  },
});

export const deleteClientDocument = createAction({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, documentId: string): Promise<void> => {
    return documentService.deleteClientDocument(ctx.supabase, documentId);
  },
});

export const checkClientDocumentStatus = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, clientId: string): Promise<ClientDocumentChecklist> => {
    return documentService.checkClientDocumentStatus(ctx.supabase, clientId);
  },
});

export const getClientsWithMissingDocuments = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx): Promise<ClientDocumentNotification[]> => {
    return documentService.getClientsWithMissingDocuments(ctx.supabase);
  },
});

export const getClientDocumentNotifications = getClientsWithMissingDocuments;

export const recordClientInteraction = createQuery({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (
    ctx,
    clientId: string,
    input: ClientInteractionInput
  ): Promise<ClientLog> => {
    return logService.recordClientInteraction(ctx.supabase, clientId, input, ctx.userId!);
  },
});

export const getClientInteractions = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, clientId: string): Promise<ClientLog[]> => {
    return logService.getClientInteractions(ctx.supabase, clientId);
  },
});

export const createClientLog = createQuery({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, clientId: string, input: CreateClientLogInput): Promise<ClientLog> => {
    return logService.createClientLog(ctx.supabase, clientId, input, ctx.userId!);
  },
});

export const getClientLogs = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, clientId: string): Promise<ClientLog[]> => {
    return logService.getClientLogs(ctx.supabase, clientId);
  },
});
