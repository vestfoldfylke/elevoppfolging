<script lang="ts">
  import { page } from "$app/state"
  import { canEditDocument } from "$lib/shared-authorization/authorization"
  import type { DocumentInput, SchoolInfo, StudentDocument } from "$lib/types/db/shared-types"
  import DocumentContent from "./DocumentContentItem.svelte"
  import DocumentEditor from "./DocumentEditor.svelte"
  import Message from "./Message.svelte"
  import NewMessage from "./NewMessage.svelte"
  import { tick } from "svelte";

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

<div id="document-{document._id}" class="document" class:open={documentOpen}>
  <button class="document-header" class:open={documentOpen} onclick={toggleDocument}>
    <div class="document-header-left">
      <h2>{document.template.name}: {editableDocument.title}</h2>
      <div>{document.school.name}</div>
    </div>
    <div class="document-header-right">
      <div><strong>{document.created.by.displayName}</strong></div>
      <div>{new Date(document.modified.at).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })}</div>
    </div>
  </button>
  {#if documentOpen}
    <div class="collapsible-content">
      <div class="document-content">
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
            <button onclick={() => editMode = !editMode}>
              <span class="material-symbols-outlined">{editMode ? "close" : "edit"}</span>{editMode ? "Lukk redigering" : "Rediger"}
            </button>
          {/if}
        </div>
      </div>
      {#if document.messages.length > 0}
        <div class="document-messages">
          {#each document.messages as message (message.messageId)}
            <Message {message} editMode={false} documentId={document._id} studentId={document.student._id} />
          {/each}
        </div>
      {/if}
      <NewMessage documentId={document._id} studentId={document.student._id} />
    </div>
  {/if}
</div>

<style>
  .document {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-primary-30);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }
  .document.open {
    margin-bottom: 2rem;
  }

  .document-header {
    flex: 1;
    display: flex;
    justify-content: space-between;
    border: none;
    border-radius: 0.5rem;
    padding: 1rem;
  }
  .document-header-left {
    text-align: left;
  }
  .document-header-right {
    text-align: right;
  }

  .document-header.open {
    border-bottom: 1px solid var(--color-primary-30);
    border-radius: 0.5rem 0.5rem 0rem 0rem;
    background-color: var(--color-primary-10);
  }
  .document-header.open:hover {
    background-color: var(--color-primary-20);
  }
  .document-header.open:active {
    background-color: var(--color-primary-30);
  }

  .document-content {
    padding: 0rem 1rem 1rem 1rem;
  }

  .document-content, .document-messages {
    border-bottom: 1px solid var(--color-primary-30);
  }

  .document-actions {
    display: flex;
    justify-content: flex-end;
  }
</style>