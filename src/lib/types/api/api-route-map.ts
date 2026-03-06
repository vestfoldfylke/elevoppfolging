import type { AccessEntry } from "../app-types"
import type { Document, DocumentContentTemplate, DocumentMessage, NewSchool } from "../db/shared-types"

type ApiDocumentsIdMessages = {
  POST: { req: DocumentMessage; res: { messageId: string } }
}

type ApiTemplatesId = {
  PUT: { req: DocumentContentTemplate; res: { updatedTemplateId: string } }
  DELETE: { res: { deletedTemplateId: string } }
}

type ApiSchoolsId = {
  DELETE: { res: { deletedSchoolNumber: string } }
  PUT: { req: NewSchool; res: { updatedSchoolId: string } }
}

type ApiAccessEntraUserIdAdd = {
  POST: { req: AccessEntry; res: { updatedAccessId: string } }
}

type ApiAccessEntraUserIdRemove = {
  POST: { req: AccessEntry; res: { updatedAccessId: string } }
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

  "/api/schools/${string}": ApiSchoolsId
  [key: `/api/schools/${string}`]: ApiSchoolsId

  "/api/schools": {
    POST: { req: NewSchool; res: { schoolId: string } }
  }

  [key: `/api/access/${string}/add`]: ApiAccessEntraUserIdAdd
  "/api/access/${string}/add": ApiAccessEntraUserIdAdd

  [key: `/api/access/${string}/remove`]: ApiAccessEntraUserIdRemove
  "/api/access/${string}/remove": ApiAccessEntraUserIdRemove
}
