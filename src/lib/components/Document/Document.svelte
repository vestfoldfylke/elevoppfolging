<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { StudentAccessPerson } from "$lib/types/app-types"
  import type { DocumentInput, MetricCount, SchoolInfo, StudentDocument } from "$lib/types/db/shared-types"
  import EditorInfo from "../EditorInfo.svelte"
  import DocumentContent from "./DocumentContentItem.svelte"
  import DocumentEditor from "./DocumentEditor.svelte"
  import Message from "./Message.svelte"
  import NewMessage from "./NewMessage.svelte"

  type PageProps = {
    document: StudentDocument // Add GroupDocument union when needed
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
        documentAccess: document.documentAccess || "EXCLUDE_SUBJECT_TEACHERS", // defaultvalue, becuase old documents doesn't have this field, and we don't want to break the editor for those
        emailAlertReceivers: document.emailAlertReceivers || []
      } as DocumentInput)
    )
  }

  const handleDocumentOpen = (document: StudentDocument): void => {
    const metricBody: MetricCount = {
      name: "Document_Open",
      description: "Number of times documents has been opened",
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

    // TODO: audit-implementation
  }

  // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounts ved endring av document (ha en key på document i parent)
  let editableDocument: DocumentInput = $state(editableDocumentFromDocument())

  let editMode = $state(false)
</script>

<div class="ds-card document-card" data-variant="tinted" data-color="accent" data-clickdelegatefor="document-modal-{document._id}-open">
  <div class="ds-card__block">
    <div class="ds-paragraph" data-size="xs" >{document.school.name}</div>
    <button id="document-modal-{document._id}-open" class="ds-button card-button" onclick={() => handleDocumentOpen(document)} data-size="lg" command="show-modal" commandfor="document-modal-{document._id}" data-variant="tertiary">{document.template.name}: {editableDocument.title}</button>
    <EditorInfo created={document.created} modified={document.modified} timestamp={true} modifiedIndicator={true} style="margin: 0;" />
  </div>
</div>

<dialog class="ds-dialog document-dialog" data-placement="center" id="document-modal-{document._id}">
  <button class="ds-button close-dialog-button" data-icon="true" data-variant="tertiary" type="button" aria-label="Lukk dialogvindu" data-color="neutral" command="close" commandfor="document-modal-{document._id}"></button>
  <div class="ds-dialog__block document-dialog-header">
    <div class="ds-paragraph" data-size="sm">{studentName || groupName} - {editableDocument.school.name}</div>
    <h2 class="ds-heading">{document.template.name}: {editableDocument.title}</h2>
    <EditorInfo created={document.created} modified={document.modified} timestamp={true} modifiedIndicator={true} />
  </div>
  
  <div class="ds-dialog__block">
    {#if !editMode}
      {#each document.content as contentItem, index}
        <DocumentContent {contentItem} editMode={false} {index} />
      {/each}

      <fieldset class="ds-fieldset content-item">
        <legend class="ds-label" data-weight="medium">
          Tilgangsstyring
        </legend>
        <ds-field class="ds-field">
          <input id="document-access-{document._id}" class="ds-input" type="checkbox" checked={document.documentAccess === "ALL_WITH_STUDENT_ACCESS"} disabled={true} style={document.documentAccess === "ALL_WITH_STUDENT_ACCESS" ? "opacity: 1;" : ""} />
          <label for="document-access-{document._id}" class="ds-label" data-weight="regular" style={document.documentAccess === "ALL_WITH_STUDENT_ACCESS" ? "opacity: 1;" : ""}>Synlig for faglærere</label>
        </ds-field>
      </fieldset>

    {:else}
      <!-- Add groupId when needed -->
      <DocumentEditor documentId={document._id} studentId={document.student._id} bind:currentDocument={editableDocument} {accessSchools} closeEditor={() => { editMode = false; editableDocument = editableDocumentFromDocument(); }} />
    {/if}

    {#if !editMode && canEditDocument}
      <div class="document-actions">
        <button class="ds-button" data-variant="secondary" data-size="sm" onclick={() => editMode = true}>
          <span class="material-symbols-outlined">{editMode ? "close" : "edit"}</span>
          Rediger
        </button>
      </div>
    {/if}
  </div>

  {#each document.messages as message (message.messageId)}
    {#if message.type === "update"}
      <div class="ds-dialog__block">
        <div class="message-header">
          <div class="message-header-left">
            <h2 class="ds-heading" data-size="xs">{`Oppfølging: ${message.content.title}`}</h2>
            <EditorInfo created={message.modified} modified={message.modified} timestamp={true} modifiedIndicator={true} />
          </div>
        </div>
        <Message {message} editMode={false} {document} />
      </div>
    {/if}
  {/each}
  <div class="ds-dialog__block">
    <NewMessage {document} {studentDataSharingConsent} {studentAccessPersons} />
  </div>
</dialog>

<style>
  .document-card {
    margin-bottom: var(--ds-size-6);
  }

  .card-button {
    padding: 0;
    margin: 0;
    min-height: min-content;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .document-actions {
    display: flex;
    justify-content: flex-end;
  }

  .card-button:hover {
    color: var(--dsc-button-color);
  }
</style>