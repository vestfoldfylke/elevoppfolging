<script lang="ts">
  import { tick } from "svelte"
  import { page } from "$app/state"
  import { canEditDocument } from "$lib/shared-authorization/authorization"
  import type { DocumentInput, SchoolInfo, StudentDocument } from "$lib/types/db/shared-types"
  import DocumentContent from "./DocumentContentItem.svelte"
  import DocumentEditor from "./DocumentEditor.svelte"
  import Message from "./Message.svelte"
  import NewMessage from "./NewMessage.svelte"
    import { prettifyDateTime } from "$lib/utils/prettify-date";

  type PageProps = {
    document: StudentDocument // Add GroupDocument union when needed
    accessSchools: SchoolInfo[]
  }

  let { document, accessSchools }: PageProps = $props()

  const toggleDocument = async () => {
    documentOpen = !documentOpen
    if (documentOpen) {
      await tick()
      const documentElement = window.document.getElementById(`document-${document._id}`)
      if (documentElement) {
        documentElement.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  const scrollToDocument = () => {
    const documentElement = window.document.getElementById(`document-${document._id}`)
    if (documentElement) {
      documentElement.scrollIntoView({ behavior: "smooth" })
    }
  }

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

  // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounter ved endring av document (ha en key på document i parent)
  let editableDocument: DocumentInput = $state(editableDocumentFromDocument())

  let documentOpen = $state(false)
  let editMode = $state(false)
</script>

<div id="document-{document._id}" class="ds-card document-card" data-variant="default" data-color="accent" style="margin-bottom: var(--ds-size-6);">
  <details class="ds-details" data-variant="default">
    <summary onclick={() => scrollToDocument()}>
      <div class="document-header">
        <div class="document-header-left">
          <h2 class="ds-heading">{document.template.name}: {editableDocument.title}</h2>
          <div class="ds-paragraph" data-size="xs">{document.school.name}</div>
        </div>
        <div class="document-header-right">
          <div class="ds-paragraph" data-size="xs">{document.created.by.displayName}</div>
          <div class="ds-paragraph" data-size="xs">{prettifyDateTime(document.modified.at)}{document.modified.at > document.created.at ? " Redigert" : ""}</div>
        </div>
      </div>
    </summary>

    <div>
      {#if !editMode}
        {#each document.content as contentItem, index}
          <DocumentContent {contentItem} editMode={false} {index} previewMode={true} />
        {/each}
      {:else}
        <!-- Add groupId when needed -->
        <DocumentEditor documentId={document._id} studentId={document.student._id} bind:currentDocument={editableDocument} accessSchools={accessSchools} closeEditor={() => { editMode = false; editableDocument = editableDocumentFromDocument(); }} />
      {/if}
      <div class="document-actions">
        {#if !editMode && canEditDocument(page.data.authenticatedPrincipal, document)}
          <button class="ds-button" data-variant="secondary" onclick={() => editMode = !editMode}>
            <span class="material-symbols-outlined">{editMode ? "close" : "edit"}</span>{editMode ? "Lukk redigering" : "Rediger"}
          </button>
        {/if}
      </div>
    </div>
  </details>

  {#each document.messages as message (message.messageId)}
    <details class="ds-details" data-variant="default">
      <summary>
        <div class="message-header">
          <div class="message-header-left">
            <div>{message.type === "update" ? `Oppfølging: ${message.content.title}` : "Kommentar"}</div>
          </div>
          <div class="message-header-right">
            <div class="ds-paragraph" data-size="xs">{message.modified.by.fallbackName}</div>
            <div class="ds-paragraph" data-size="xs">{prettifyDateTime(message.modified.at)}</div>
          </div>
        </div>
      </summary>
      <div>
        <Message {message} editMode={false} documentId={document._id} studentId={document.student._id} />
      </div>
    </details>
  {/each}
  <div class="ds-card__block">
    <NewMessage documentId={document._id} studentId={document.student._id} />
  </div>
</div>

<style>
  .document-card {
    scroll-margin-top: var(--header-height);
  }

  .document-header, .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .document-header {
    padding: var(--ds-size-4) 0;
  }

  .document-header-right, .message-header-right {
    text-align: right;
  }

  .document-actions {
    display: flex;
    justify-content: flex-end;
  }
</style>