<script lang="ts">
  import { page } from "$app/state"
  import { canEditStudentDocument } from "$lib/shared-authorization/authorization"
  import type { AccessEntry } from "$lib/types/app-types"
  import type { DocumentInput, SchoolInfo, StudentDocument } from "$lib/types/db/shared-types"
  import EditorInfo from "../EditorInfo.svelte"
  import DocumentContent from "./DocumentContentItem.svelte"
  import DocumentEditor from "./DocumentEditor.svelte"
  import Message from "./Message.svelte"
  import NewMessage from "./NewMessage.svelte"

  type PageProps = {
    document: StudentDocument // Add GroupDocument union when needed
    principalAccessEntriesForStudent: AccessEntry[]
    studentName?: string
    groupName?: string
  }

  let { document, principalAccessEntriesForStudent, studentName, groupName }: PageProps = $props()

  let accessSchools: SchoolInfo[] = $derived.by(() => {
    return principalAccessEntriesForStudent.map((access) => {
      const school = page.data.schools.find((school) => school.schoolNumber === access.schoolNumber)
      if (!school) {
        throw new Error(`School not found for access with school number ${access.schoolNumber}, something wrong here gitt`)
      }
      return school
    })
  })

  const editableDocumentFromDocument = () => {
    return JSON.parse(
      JSON.stringify({
        content: document.content,
        school: document.school,
        template: document.template,
        title: document.title
      } as DocumentInput)
    )
  }

  // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounts ved endring av document (ha en key på document i parent)
  let editableDocument: DocumentInput = $state(editableDocumentFromDocument())

  let editMode = $state(false)
</script>

<div class="ds-card document-card" data-variant="tinted" data-color="accent" data-clickdelegatefor="document-modal-{document._id}-open">
  <div class="ds-card__block">
    <div class="ds-paragraph" data-size="xs" >{document.school.name}</div>
    <button id="document-modal-{document._id}-open" class="ds-button card-button" data-size="lg" command="show-modal" commandfor="document-modal-{document._id}" data-variant="tertiary">{document.template.name}: {editableDocument.title}</button>
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
    {:else}
      <!-- Add groupId when needed -->
      <DocumentEditor documentId={document._id} studentId={document.student._id} bind:currentDocument={editableDocument} {accessSchools} closeEditor={() => { editMode = false; editableDocument = editableDocumentFromDocument(); }} />
    {/if}

    {#if !editMode && canEditStudentDocument(page.data.authenticatedPrincipal, principalAccessEntriesForStudent, document)}
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
        <Message {message} editMode={false} documentId={document._id} studentId={document.student._id} />
      </div>
    {/if}
  {/each}
  <div class="ds-dialog__block">
    <NewMessage documentId={document._id} studentId={document.student._id} />
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