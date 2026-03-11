import type { DocumentContentTemplate, DocumentInput, DocumentMessageInput, ManualAccessEntryInput, NewSchool, StudentCheckBoxInput, StudentDataSharingConsentInput } from "../db/shared-types"

type ApiDocumentsIdMessages = {
  POST: { req: DocumentMessageInput; res: { messageId: string } }
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
  POST: { req: ManualAccessEntryInput; res: { updatedAccessId: string } }
}

type ApiAccessEntraUserIdRemove = {
  POST: { req: ManualAccessEntryInput; res: { updatedAccessId: string } }
}

type ApiStudentsIdConsent = {
  PATCH: { req: StudentDataSharingConsentInput; res: { consentId: string } }
}

/**
 * Define a mapping of API routes to their expected request and response types. This will be used to provide type safety for api routes and the apiFetch function, ensuring that the correct request body is provided for each route and that the response is correctly typed.
 */
export interface ApiRouteMap {
  "/api/templates": {
    POST: { req: DocumentContentTemplate; res: { templateId: string } }
  }
  [key: `/api/templates/${string}`]: ApiTemplatesId

  [key: `/api/schools/${string}`]: ApiSchoolsId
  "/api/schools": {
    POST: { req: NewSchool; res: { schoolId: string } }
  }

  [key: `/api/access/${string}/add`]: ApiAccessEntraUserIdAdd

  [key: `/api/access/${string}/remove`]: ApiAccessEntraUserIdRemove

  [key: `/api/students/${string}/consent`]: ApiStudentsIdConsent

  [key: `/api/students/${string}/documents`]: {
    POST: { req: DocumentInput; res: { documentId: string } }
  }

  [key: `/api/students/${string}/documents/${string}/messages`]: ApiDocumentsIdMessages

  "/api/studentcheckboxes": {
    POST: { req: StudentCheckBoxInput; res: { checkBoxId: string } }
  }

  [key: `/api/studentcheckboxes/${string}`]: {
    DELETE: { res: { deletedCheckBoxId: string } }
    PATCH: { req: StudentCheckBoxInput; res: { updatedCheckBoxId: string } }
  }
}
