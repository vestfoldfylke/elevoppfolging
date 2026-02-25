<script lang="ts">
  import { slide } from "svelte/transition"
  import type { Document } from "$lib/types/db/shared-types"
  import DocumentContent from "./DocumentContentItem.svelte"
  import Message from "./Message.svelte"
  import NewMessage from "./NewMessage.svelte"

  type PageProps = {
    document: Document
  }

  let { document }: PageProps = $props()

  let documentOpen = $state(false)
</script>

<div class="document" class:open={documentOpen}>
  <button class="document-title" class:open={documentOpen} onclick={() => documentOpen = !documentOpen}>
    <h2>{document.template.name}: {document.title}</h2>
    <div class="document-title-metadata">
      <div><strong>{document.created.by.displayName}</strong></div>
      <div>{new Date(document.modified.at).toLocaleString('no-NO', { dateStyle: 'short', timeStyle: 'short' })}</div>
      <div>{document.school.name}</div>
    </div>
  </button>
  {#if documentOpen}
    <div class="collapsible-content" transition:slide={{ duration: 200 }}>
      <div class="document-content">
        {#each document.content as contentItem, index}
          <DocumentContent {contentItem} editMode={false} {index} />
        {/each}
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