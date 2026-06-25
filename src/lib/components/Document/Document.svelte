<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton, { type AsyncButtonResult } from "$lib/components/AsyncButton.svelte"
  import { createEditableDraft, type EditableDraft } from "$lib/runes/create-editable-draft.svelte"
  import { authorizeAddMessageToGroupDocument, authorizeAddMessageToStudentDocument } from "$lib/shared-authorization/authorization"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { FrontendStudentDocument, PrincipalAccessForStudent, StudentAccessPerson } from "$lib/types/app-types"
  import type { AuditEntryInput, ClassGroup, DocumentInput, GroupDocument, MetricCount, SchoolInfo, StudentClassGroup, StudentDataSharingConsent } from "$lib/types/db/shared-types"
  import EditorInfo from "../EditorInfo.svelte"
  import DocumentContent from "./DocumentContentItem.svelte"
  import DocumentEditor from "./DocumentEditor.svelte"
  import Message from "./Message.svelte"
  import NewMessage from "./NewMessage.svelte"

  type PageProps = {
    document: FrontendStudentDocument | GroupDocument
    accessSchools: SchoolInfo[]
    canEditDocument: boolean
    canRemoveDocument: boolean
    studentName?: string
    groupName?: string
    studentDataSharingConsent?: StudentDataSharingConsent | null
    studentAccessPersons?: StudentAccessPerson[]
    principalAccessForStudent?: PrincipalAccessForStudent[]
    principalClasses?: StudentClassGroup[]
    referencedOpen?: boolean
  }

  let {
    document,
    accessSchools,
    canEditDocument,
    canRemoveDocument,
    studentName,
    groupName,
    studentDataSharingConsent,
    studentAccessPersons,
    principalAccessForStudent,
    principalClasses,
    referencedOpen = false
  }: PageProps = $props()

  let documentDialog: HTMLDialogElement | undefined = $state()

  let originalDialogParent: HTMLElement | undefined = $state()

  let isDocumentContentHidden = $derived.by(() => {
    if (!("student" in document)) {
      return false
    }

    return document.isDocumentContentHidden
  })

  let canAddMessage = $derived.by(() => {
    if ("group" in document) {
      if (!principalClasses) {
        throw new Error("principalClasses is required to authorize add message in group document")
      }
      return authorizeAddMessageToGroupDocument({ principalClasses, document }).authorized
    }

    if ("student" in document) {
      if (!principalAccessForStudent) {
        throw new Error("principalAccessForStudent is required to authorize add message in student document")
      }
      if (studentDataSharingConsent === undefined) {
        throw new Error("studentDataSharingConsent is required to authorize add message in student document")
      }

      return authorizeAddMessageToStudentDocument({ accessToStudent: principalAccessForStudent, document, authenticatedPrincipal: page.data.authenticatedPrincipal, studentDataSharingConsent })
        .authorized
    }

    throw new Error("Document is neither student or group document, can't authorize add message")
  })

  // Only the "update" messages shown in the timeline (used for heading + count)
  let updateMessages = $derived(document.messages.filter((message) => message.type === "update"))

  const openDialog = () => {
    if (!documentDialog) {
      throw new Error("Document dialog not found, I expected it to be there...")
    }

    window.document.body.appendChild(documentDialog) // To keep the dialog on server load, and not lose backdrop
    documentDialog.showModal()
  }

  onMount(async () => {
    if (!documentDialog) {
      throw new Error("Document dialog not found, I expected it to be there...")
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

    if (referencedOpen) {
      handleDocumentOpen(document)
    }
  })

  const handleDocumentOpen = (document: FrontendStudentDocument | GroupDocument): void => {
    openDialog()

    const metricBody: MetricCount = {
      name: studentName ? "StudentDocument_Open" : "GroupDocument_Open",
      description: `Number of times ${studentName ? "student" : "group"} documents has been opened`,
      labels: [
        ["schoolNumber", document.school.schoolNumber],
        ["schoolName", document.school.name]
      ]
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
        errorMessage: `opening ${errorMessageTemplateName}`,
        errorMessageObject: document._id
      },
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const handleDocumentRemove = async (): Promise<AsyncButtonResult> => {
    const confirmDelete = confirm("Er du heeeelt sikker på du vil slette dette notatet da? Notatet og alle tilhørende oppdateringer vil bli borte borte")
    if (!confirmDelete) {
      return { status: "cancelled" }
    }

    if (studentName && "student" in document) {
      const removeDocumentRoute = `/api/students/${document.student._id as NoSlashString}/documents/${document._id as NoSlashString}` as const

      await apiFetch(removeDocumentRoute, {
        method: "DELETE"
      })

      documentDialog?.close()

      return { status: "success", reloadPageData: true }
    }

    if (groupName && "group" in document) {
      const removeDocumentRoute = `/api/classes/${document.group.systemId as NoSlashString}/documents/${document._id as NoSlashString}` as const

      await apiFetch(removeDocumentRoute, {
        method: "DELETE"
      })

      documentDialog?.close()

      return { status: "success", reloadPageData: true }
    }

    return { status: "error", message: "Document was neither student or group document??" }
  }

  let editableDocument: EditableDraft<DocumentInput> = createEditableDraft(() => {
    return {
      content: document.content,
      school: document.school,
      template: document.template,
      title: document.title,
      documentAccess: document.documentAccess || "EXCLUDE_SUBJECT_TEACHERS",
      emailAlertReceivers: document.emailAlertReceivers || []
    }
  })

  let editMode = $state(false)
</script>

<div>
  <div class="ds-card document-card" data-variant="tinted" data-color="accent" data-clickdelegatefor="document-modal-{document._id}-open">
    <div class="ds-card__block">
      <div class="ds-paragraph document-card-title" data-size="xs" style="margin-bottom: var(--ds-size-2);">
        <div>{document.school.name}</div>
        <div class="document-card-title-icons">
          {#if isDocumentContentHidden}
            <span class="material-symbols-outlined" data-tooltip="Du har ikke tilgang til innholdet i dette notatet">visibility_off</span>
          {/if}
          {#if document.isDocumentLocked}
            <span class="material-symbols-outlined" data-tooltip="Dette notatet er skrivebeskyttet fordi det tilhører et tidligere skoleår">lock</span>
          {/if}
        </div>
      </div>
      <button id="document-modal-{document._id}-open" class="ds-button card-button" onclick={() => handleDocumentOpen(document)} data-size="lg" data-variant="tertiary" aria-label="{document.template.name}: {document.title || "Tittelen er skjult"}">{document.template.name}</button>
      {#if !isDocumentContentHidden}
        <p class="ds-paragraph" style="margin: 0;">{document.title}</p>
      {/if}
      <EditorInfo editorInfo={document.created} isEdited={document.modified.at.getTime() > document.created.at.getTime()} timestamp={false} modifiedIndicator={true} style="margin-top: var(--ds-size-2);" />
    </div>

    {#if document.messages.length > 0 && !isDocumentContentHidden}
      <div class="ds-card__block">
        <div class="ds-label" data-weight="medium" data-size="xs">
          <EditorInfo editorInfo={document.messages[document.messages.length - 1].created} isEdited={document.messages[document.messages.length - 1].modified.at.getTime() > document.messages[document.messages.length - 1].created.at.getTime()} timestamp={false} modifiedIndicator={false} style="margin: 0;" prefix="{document.messages.length} oppdatering{document.messages.length > 1 ? 'er' : ''}. Siste oppdatering fra " />
        </div>
      </div>
    {/if}
  </div>

  <dialog bind:this={documentDialog} class="ds-dialog document-dialog" data-placement="center" id="document-modal-{document._id}">
    <!-- Titlebar -->
    <div class="document-dialog-titlebar">
      <div class="document-dialog-header-tags">
        <span class="ds-tag" data-color="accent" data-size="lg">
          <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">article</span>
          {document.template.name}
        </span>
        <span class="ds-tag" data-color="brand1" data-size="lg">
          <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">school</span>
          {studentName || groupName} - {editableDocument.draft.school.name}
        </span>
        {#if document.isDocumentLocked}
          <span class="ds-tag" data-color="danger" data-size="lg" data-tooltip="Dette notatet er skrivebeskyttet fordi det tilhører et tidligere skoleår">
            <span class="material-symbols-outlined">lock</span>
          </span>
        {/if}
      </div>

      <button class="ds-button close-dialog-button" data-icon="true" data-variant="tertiary" type="button" aria-label="Lukk dialogvindu" data-color="neutral" command="close" commandfor="document-modal-{document._id}"></button>
    </div>

    <div class="ds-dialog__block">
      <!-- Main note (HOVEDNOTAT) card -->
      <div class="main-document-card" class:main-document-card--editing={editMode}>
        {#if !editMode}
          <div class="main-document-label">
            <span class="material-symbols-outlined">push_pin</span>
            <span>HOVEDNOTAT</span>
          </div>
        {/if}

        {#if !editMode}
          {#if !isDocumentContentHidden}
            <h2 class="ds-heading main-document-title">{document.title}</h2>
          {/if}
          <EditorInfo editorInfo={document.created} isEdited={document.modified.at.getTime() > document.created.at.getTime()} timestamp={true} modifiedIndicator={true} />

          {#if !isDocumentContentHidden}
            {#each document.content as contentItem, index}
              <DocumentContent {contentItem} editMode={false} {index} />
            {/each}
          {:else}
            <h2 class="ds-heading" style="font-weight: bold; margin-bottom: var(--ds-size-4);">[Du har ikke tilgang til se innholdet]</h2>
          {/if}
        {:else}
          <DocumentEditor documentId={document._id} studentId={"student" in document ? document.student._id : undefined} groupSystemId={"group" in document ? document.group.systemId : undefined} bind:currentDocument={editableDocument.draft} {accessSchools} documentEdited={editableDocument.isDirty} closeEditor={() => { editMode = false; editableDocument.cancel() }} />
        {/if}

        {#if !editMode}
          <div class="document-footer">
            <div class="document-metadata">
              {#if studentName || (document.emailAlertReceivers && document.emailAlertReceivers.length > 0)}
                <div class="document-info">
                  {#if studentName}
                    <span class="ds-tag" data-color="neutral" data-variant="outline" data-size="sm">
                      <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">{document.documentAccess === "EXCLUDE_SUBJECT_TEACHERS" || document.documentAccess === "ONLY_CREATOR" ? "visibility_off" : "visibility"}</span>
                      {#if document.documentAccess === "ALL_WITH_STUDENT_ACCESS"}
                        Synlig for alle med tilgang til eleven
                      {:else if document.documentAccess === "EXCLUDE_SUBJECT_TEACHERS"}
                        Synlig for alle med tilgang til eleven unntatt faglærere
                      {:else if document.documentAccess === "ONLY_CREATOR"}
                        Kun synlig for {document.created.by.fallbackName}
                      {/if}
                    </span>
                  {/if}

                  {#if document.emailAlertReceivers && document.emailAlertReceivers.length > 0}
                    <span class="ds-tag" data-color="neutral" data-variant="outline" data-size="sm">
                      <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">mail</span>
                      <button data-popover="inline" popoverTarget="email-receivers-{document._id}">{document.emailAlertReceivers.length} person{document.emailAlertReceivers.length > 1 ? "er" : ""}</button>&nbsp;varslet på e-post
                    </span>

                    <div id="email-receivers-{document._id}" class="ds-popover" popover="auto" data-placement="top">
                      {#each document.emailAlertReceivers as emailReceiver}
                        <p class="ds-paragraph" data-size="xs">{emailReceiver}</p>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            {#if (canEditDocument || canRemoveDocument) && !document.isDocumentLocked}
              <div class="document-footer-actions">
                {#if canEditDocument}
                  <button class="ds-button" data-variant="secondary" data-size="sm" onclick={() => editMode = true}>
                    <span class="material-symbols-outlined">{editMode ? "close" : "edit"}</span>
                    Rediger
                  </button>
                {/if}
                {#if canRemoveDocument}
                  <AsyncButton buttonText="Slett notat" onClick={handleDocumentRemove} dataSize="sm" iconName="delete" color="danger" />
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Updates timeline -->
      {#if !isDocumentContentHidden && updateMessages.length > 0}
        <div class="updates-section">
          <div class="updates-heading">
            <span class="updates-heading-title">Oppdateringer</span>
            <span class="updates-count">{updateMessages.length}</span>
          </div>

          <div class="timeline">
            {#each updateMessages as message (message.messageId)}
              <div class="timeline-item">
                <span class="timeline-dot"></span>
                <div class="message-container">
                  <Message {message} editMode={false} {document} {principalAccessForStudent} />
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    {#if canAddMessage && !isDocumentContentHidden}
      <div class="ds-dialog__block">
        <NewMessage {document} {studentDataSharingConsent} {studentAccessPersons} />
      </div>
    {/if}
  </dialog>
</div>

<style>
  .document-card {
    margin-bottom: var(--ds-size-6);
  }

  .document-card-title {
    display: flex;
    justify-content: space-between;
  }

  .card-button {
    padding: 0;
    margin: 0;
    min-height: min-content;
    min-width: min-content;
  }

  .card-button:hover {
    color: var(--dsc-button-color);
  }

  .document-dialog-titlebar {
    flex: none;
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: var(--ds-size-3);
    padding: var(--ds-size-4) var(--ds-size-6);
    border-bottom: 1px solid var(--ds-color-neutral-border-subtle);
    background-color: white;
  }

  /* ---------- Header tags ---------- */
  .document-dialog-header-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-size-3);
  }

  /* ---------- HOVEDNOTAT card ---------- */
  .main-document-card {
    background: var(--ds-color-accent-surface-tinted, #e5eeef);
    border-left: 6px solid var(--ds-color-accent-base-default, #005260);
    border-radius: var(--ds-border-radius-md, 8px);
    padding: var(--ds-size-5, 1.25rem) var(--ds-size-6, 1.5rem);
    margin-bottom: var(--ds-size-8, 2rem);
  }

  .main-document-card--editing {
    background: var(--ds-color-neutral-surface-default, #fff);
    border-left-color: var(--ds-color-neutral-border-subtle, #d7d7d7);
  }

  .main-document-label {
    display: flex;
    align-items: center;
    gap: var(--ds-size-2, 0.5rem);
    margin-bottom: var(--ds-size-2, 0.5rem);
    color: var(--ds-color-accent-base-default, #005260);
  }

  .main-document-label .material-symbols-outlined {
    font-size: 20px;
  }

  .main-document-label > span:last-child {
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .main-document-title {
    margin: 0 0 var(--ds-size-1, 0.25rem);
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.15;
    color: var(--ds-color-accent-base-default, #005260);
  }

  /* ---------- Updates heading + count ---------- */
  .updates-heading {
    display: flex;
    align-items: center;
    gap: var(--ds-size-3, 0.75rem);
    margin-bottom: var(--ds-size-4, 1rem);
  }

  .updates-heading-title {
    font-size: 1.375rem;
    font-weight: 700;
  }

  .updates-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    padding: 0 7px;
    border-radius: 999px;
    background: var(--ds-color-neutral-surface-tinted, #f2f2f2);
    color: var(--ds-color-neutral-text-subtle, #4a4a4a);
    font-size: 0.875rem;
    font-weight: 600;
  }

  /* ---------- Timeline ---------- */
  .timeline {
    position: relative;
    padding-left: 30px;
  }

  .timeline::before {
    content: "";
    position: absolute;
    left: 5px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: var(--ds-color-neutral-border-subtle, #d7d7d7);
  }

  .timeline-item {
    position: relative;
    padding-bottom: var(--ds-size-5, 1.25rem);
  }

  .timeline-item:not(:last-child) {
    border-bottom: 1px solid var(--ds-color-neutral-border-subtle, #d7d7d7);
    margin-bottom: var(--ds-size-5, 1.25rem);
  }

  .timeline-dot {
    position: absolute;
    left: -30px;
    top: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-sizing: border-box;
    background: var(--ds-color-neutral-background-default, #fff);
    border: 2px solid var(--ds-color-neutral-base-default, #7b7b7a);
  }

  .message-container {
    flex: 1;
  }

  /* ---------- In-card footer (metadata + edit/delete) ---------- */
  .document-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--ds-size-3, 0.75rem);
    margin-top: var(--ds-size-4, 1rem);
  }

  .document-info {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-size-2, 0.5rem);
  }

  .document-footer-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--ds-size-2, 0.5rem);
  }
</style>