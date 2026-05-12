<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { StudentAccessPerson } from "$lib/types/app-types"
  import type { AuditEntryInput, DocumentInput, GroupDocument, MetricCount, SchoolInfo, StudentDocument } from "$lib/types/db/shared-types"
  import EditorInfo from "../EditorInfo.svelte"
  import DocumentContent from "./DocumentContentItem.svelte"
  import DocumentEditor from "./DocumentEditor.svelte"
  import Message from "./Message.svelte"
  import NewMessage from "./NewMessage.svelte"

  type PageProps = {
    document: StudentDocument | GroupDocument
    accessSchools: SchoolInfo[]
    canEditDocument: boolean
    studentName?: string
    groupName?: string
    studentDataSharingConsent?: boolean
    studentAccessPersons?: StudentAccessPerson[]
  }

  let { document, accessSchools, canEditDocument, studentName, groupName, studentDataSharingConsent, studentAccessPersons }: PageProps = $props()

  const editableDocumentFromDocument = () => {
    return JSON.parse(
      JSON.stringify({
        content: document.content,
        school: document.school,
        template: document.template,
        title: document.title,
        documentAccess: document.documentAccess || "EXCLUDE_SUBJECT_TEACHERS", // default value, because old documents doesn't have this field, and we don't want to break the editor for those
        emailAlertReceivers: document.emailAlertReceivers || []
      } as DocumentInput)
    )
  }

  let documentDialog: HTMLDialogElement | undefined = $state()

  let originalDialogParent: HTMLElement | undefined = $state()

  const openDialog = () => {
    if (!documentDialog) {
      throw new Error("Document dialog not found, I excpected it to be there...")
    }

    window.document.body.appendChild(documentDialog) // To keep the dialog on server load, and not lose backdrop
    documentDialog.showModal()
  }

  onMount(async () => {
    if (!documentDialog) {
      throw new Error("Document dialog not found, I excpected it to be there...")
    }

    originalDialogParent = documentDialog.parentElement || undefined

    if (!originalDialogParent) {
      throw new Error("Document dialog doesn't have a parent element, I expected it to have one...")
    }
    
    documentDialog.addEventListener("close", () => {
      if (!originalDialogParent) {
        throw new Error("Original dialog parent is not defined, can't move dialog back to original parent")
      }

      if (!documentDialog) {
        throw new Error("Document dialog not found, I expected it to be there...")
      }

      if (documentDialog.parentElement === originalDialogParent) {
        // dialog is already in the original parent, no need to move it
        return
      }

      originalDialogParent.appendChild(documentDialog) // Move back to original parent, to not mess with svelte too much
    })
  })

  const handleDocumentOpen = (document: StudentDocument | GroupDocument): void => {
    openDialog()

    const metricBody: MetricCount = {
      name: studentName ? "StudentDocument_Open" : "GroupDocument_Open",
      description: `Number of times ${studentName ? "student" : "group"} documents has been opened`,
      labels: [["schoolNumber", document.school.schoolNumber]]
    }

    // we don't need to await this since we actually don't care if it goes through or not
    apiFetch("/api/metrics", {
      method: "POST",
      body: metricBody,
      headers: {
        "Content-Type": "application/json"
      }
    })

    const auditEntry: AuditEntryInput = {
      created: {
        by: {
          entraUserId: page.data.authenticatedPrincipal.id,
          fallbackName: page.data.authenticatedPrincipal.displayName
        },
        at: new Date()
      },
      action: "OPEN",
      metaData: {
        parentResource: "student" in document ? "Student" : "Group",
        parentResourceId: "student" in document ? document.student._id : document.group.systemId,
        schoolId: document.school.schoolNumber
      },
      resource: "student" in document ? "StudentDocument" : "GroupDocument",
      resourceId: document._id,
      resourceName: studentName || groupName || ""
    }

    const errorMessageTemplateName: string = "student" in document ? "StudentDocumentId" : "GroupDocumentId"

    // we don't need to await this since we don't need to know if it goes through or not
    apiFetch("/api/audit/insert", {
      method: "POST",
      body: {
        auditEntry,
        errorMessage: `opening ${errorMessageTemplateName} {${errorMessageTemplateName}}`,
        errorMessageObject: document._id
      },
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounts ved endring av document (ha en key på document i parent)
  let editableDocument: DocumentInput = $state(editableDocumentFromDocument())

  let editMode = $state(false)
</script>

<div>
  <div class="ds-card document-card" data-variant="tinted" data-color="accent" data-clickdelegatefor="document-modal-{document._id}-open">
    <div class="ds-card__block">
      <div class="ds-paragraph" data-size="xs" style="margin-bottom: var(--ds-size-2);">{document.school.name}</div>
      <button id="document-modal-{document._id}-open" class="ds-button card-button" onclick={() => handleDocumentOpen(document)} data-size="lg" data-variant="tertiary" aria-label="{document.template.name}: {editableDocument.title}">{document.template.name}</button>
      <p class="ds-paragraph" style="margin: 0;">{document.title}</p>
      <EditorInfo editorInfo={document.created} isEdited={document.modified.at.getTime() > document.created.at.getTime()} timestamp={false} modifiedIndicator={true} style="margin-top: var(--ds-size-2);" />
    </div>

    {#if document.messages.length > 0}
      <div class="ds-card__block">
        <div class="ds-label" data-weight="medium" data-size="xs">
          <EditorInfo editorInfo={document.messages[0].created} isEdited={document.messages[0].modified.at.getTime() > document.messages[0].created.at.getTime()} timestamp={false} modifiedIndicator={false} style="margin: 0;" prefix="{document.messages.length} oppdatering{document.messages.length > 1 ? 'er' : ''}. Siste oppdatering fra " />
        </div>
      </div>
    {/if}
  </div>

  <dialog bind:this={documentDialog} class="ds-dialog document-dialog" data-placement="center" id="document-modal-{document._id}">
    <button class="ds-button close-dialog-button" data-icon="true" data-variant="tertiary" type="button" aria-label="Lukk dialogvindu" data-color="neutral" command="close" commandfor="document-modal-{document._id}"></button>
    
    <div class="ds-dialog__block">
      <div class="document-dialog-header">
        <div class="document-dialog-header-tags">
          <span class="ds-tag" data-color="accent" data-size="lg">
            <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">article</span>
            {document.template.name}
          </span>
          <span class="ds-tag" data-color="brand1" data-size="lg">
            <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">school</span>
            {studentName || groupName} - {editableDocument.school.name}
          </span>
        </div>

        {#if !editMode}
          <h2 class="ds-heading">{editableDocument.title}</h2>
          <EditorInfo editorInfo={document.created} isEdited={document.modified.at.getTime() > document.created.at.getTime()} timestamp={true} modifiedIndicator={true} />
        {/if}
      </div>
      
      <div>
        {#if !editMode}
          {#each document.content as contentItem, index}
            <DocumentContent {contentItem} editMode={false} {index} />
          {/each}

        {:else}
          <DocumentEditor documentId={document._id} studentId={"student" in document ? document.student._id : undefined} groupSystemId={"group" in document ? document.group.systemId : undefined} bind:currentDocument={editableDocument} {accessSchools} closeEditor={() => { editMode = false; editableDocument = editableDocumentFromDocument(); }} />
        {/if}

        <div class="document-footer">
          {#if !editMode}
            <div class="document-metadata">
              {#if !editMode && (studentName || (document.emailAlertReceivers && document.emailAlertReceivers.length > 0))}    
                <div class="document-info">
                  {#if studentName}
                    <span class="ds-tag" data-color="neutral" data-size="sm">
                      <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">{document.documentAccess === "ALL_WITH_STUDENT_ACCESS" ? "visibility" : "visibility_off"}</span>
                      {document.documentAccess === "ALL_WITH_STUDENT_ACCESS" ? "Synlig for faglærere" : "Ikke synlig for faglærere"}
                    </span>
                  {/if}

                  {#if document.emailAlertReceivers && document.emailAlertReceivers.length > 0}
                    <span class="ds-tag" data-color="neutral" data-size="sm">
                      <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">mail</span>
                      <button data-popover="inline" popoverTarget="email-receivers-{document._id}">{document.emailAlertReceivers.length} person{document.emailAlertReceivers.length > 1 ? "er" : ""}</button>&nbsp;varslet på e-post
                    </span>

                    <div id="email-receivers-{document._id}" class="ds-popover" popover="manual" data-placement="top">
                      {#each document.emailAlertReceivers as emailReceiver}
                        <p class="ds-paragraph" data-size="xs">{emailReceiver}</p>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            {#if canEditDocument}
              <button class="ds-button" data-variant="secondary" data-size="sm" onclick={() => editMode = true}>
                <span class="material-symbols-outlined">{editMode ? "close" : "edit"}</span>
                Rediger
              </button>
            {/if}
          {/if}
        </div>
      </div>
    </div>

    {#each document.messages as message (message.messageId)}
      {#if message.type === "update"}
        <div class="ds-dialog__block message-block">
          <div class="message-container">
            <Message {message} editMode={false} {document} />
          </div>
        </div>
      {/if}
    {/each}
    <div class="ds-dialog__block">
      <NewMessage {document} {studentDataSharingConsent} {studentAccessPersons} />
    </div>
  </dialog>
</div>

<style>
  .document-card {
    margin-bottom: var(--ds-size-6);
  }

  .document-dialog-header-tags {
    margin-bottom: var(--ds-size-2);
  }

  .message-container {
    flex: 1;
  }

  .card-button {
    padding: 0;
    margin: 0;
    min-height: min-content;
  }

  .document-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }

  .card-button:hover {
    color: var(--dsc-button-color);
  }
</style>