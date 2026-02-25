<script lang="ts">
  import { slide } from "svelte/transition"
  import type { Document, School } from "$lib/types/db/shared-types"
  import DocumentContent from "./DocumentContentItem.svelte"
  import Message from "./Message.svelte"
  import NewMessage from "./NewMessage.svelte"
  import { canEditDocument } from "$lib/shared-authorization/authorization";
  import { page } from "$app/state";
  import DocumentEditor from "./DocumentEditor.svelte";

  type PageProps = {
    document: Document
    accessSchools: School[]
  }

  let { document, accessSchools }: PageProps = $props()

  // svelte-ignore state_referenced_locally - we don't want to mutate the original document prop, but we want to be able to edit the document in the editor, so we create a local copy of the document that we can mutate
  let editableDocument = $state(JSON.parse(JSON.stringify(document)))

  let documentOpen = $state(false)
  let editMode = $state(false)

</script>

<div class="document" class:open={documentOpen}>
  <button class="document-title" class:open={documentOpen} onclick={() => documentOpen = !documentOpen}>
    <h2>{document.template.name}: {editableDocument.title}</h2>
    <div class="document-title-metadata">
      <div><strong>{document.created.by.displayName}</strong></div>
      <div>{new Date(document.modified.at).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })}</div>
      <div>{document.school.name}</div>
    </div>
  </button>
  {#if documentOpen}
    <div class="collapsible-content" transition:slide={{ duration: 200 }}>
      <div class="document-content">
        {#if !editMode}
          {#each document.content as contentItem, index}
            <DocumentContent {contentItem} editMode={false} {index} previewMode={true} />
          {/each}
        {:else}
          <DocumentEditor bind:currentDocument={editableDocument} accessSchools={accessSchools} closeEditor={() => { editMode = false; editableDocument = JSON.parse(JSON.stringify(document)); }} />
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
            <Message {message} editMode={false} documentId={document._id} />
          {/each}
        </div>
      {/if}
      <div class="message-actions">
        <NewMessage documentId={document._id} />
      </div>
    </div>
  {/if}
</div>

<style>
  .document {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-primary);
    border-radius: 0.5rem;
  }
  .document.open {
    margin-bottom: 1rem;
  }

  .document-title {
    flex: 1;
    display: flex;
    justify-content: space-between;
    border: none;
    border-radius: 0.5rem;
  }
  .document-title.open {
    border-bottom: 1px solid var(--color-primary);
    border-radius: 0.5rem 0.5rem 0rem 0rem;
    background-color: var(--color-primary-10);
  }
  .document-title.open:hover {
    background-color: var(--color-primary-20);
  }
  .document-title.open:active {
    background-color: var(--color-primary-30);
  }

  .document-content, .document-messages, .message-actions {
    padding: 0rem 1rem 1rem 1rem;
  }

  .document-content {
    border-bottom: 1px solid var(--color-primary);
  }
</style>