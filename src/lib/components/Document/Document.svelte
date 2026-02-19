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

<div class="document">
  <div class="document-header">
    <button class="document-title" onclick={() => documentOpen = !documentOpen}>
      <h2>{document.title}</h2>
      <p>{document.created.by.displayName}</p>
    </button>
  </div>
  {#if documentOpen}
    <div class="document-collapsible" transition:slide={{ duration: 200 }}>
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
      <div class="document-actions">
        <NewMessage documentId={document._id} />
      </div>
    </div>
  {/if}
</div>

<style>
  .document {
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
  }
  .document-header {
    display: flex;
    align-items: center;
  }
  .document-title {
    flex: 1;
    display: flex;
    cursor: pointer;
    justify-content: space-between;
    border: none;
  }
  .document-collapsible > div {
    padding: 0.5rem;
    border-bottom: 1px solid #ccc;
  }
  .document-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
  }
</style>