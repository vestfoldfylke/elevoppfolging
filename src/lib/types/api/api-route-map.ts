import type { Document, DocumentContentTemplate, DocumentMessage } from "../db/shared-types"

type ApiDocumentsIdMessages = {
  POST: { req: DocumentMessage; res: { messageId: string } }
}

type ApiTemplatesId = {
  PUT: { req: DocumentContentTemplate; res: { updatedTemplateId: string } }
  DELETE: { res: { deletedTemplateId: string } }
}


/**
 * Define a mapping of API routes to their expected request and response types. This will be used to provide type safety for api routes and the apiFetch function, ensuring that the correct request body is provided for each route and that the response is correctly typed.
 */
export interface ApiRouteMap {
  "/api/documents": {
    POST: { req: Document; res: { documentId: string } }
  }

  [key: `/api/documents/${string}/messages`]: ApiDocumentsIdMessages
  "/api/documents/${string}/messages": ApiDocumentsIdMessages

  "/api/templates": {
    POST: { req: DocumentContentTemplate; res: { templateId: string } }
  }

  [key: `/api/templates/${string}`]: ApiTemplatesId
  "/api/templates/${string}": ApiTemplatesId
}
