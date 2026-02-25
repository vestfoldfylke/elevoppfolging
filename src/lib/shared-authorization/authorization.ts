import type { ApplicationInfo } from "$lib/types/app-types";
import type { AuthenticatedPrincipal } from "$lib/types/authentication";
import type { Document, DocumentMessage } from "$lib/types/db/shared-types";

export const isSystemAdmin = (authenticatedPrincipal: AuthenticatedPrincipal, APP_INFO: ApplicationInfo): boolean => {
  return authenticatedPrincipal.roles.includes(APP_INFO.ROLES.ADMIN)
}

export const canEditDocument = (authenticatedPrincipal: AuthenticatedPrincipal, document: Document): boolean => {
  return document.created.by.entraUserId === authenticatedPrincipal.id
}

export const canEditDocumentMessage = (authenticatedPrincipal: AuthenticatedPrincipal, message: DocumentMessage): boolean => {
  return message.created.by.entraUserId === authenticatedPrincipal.id
}