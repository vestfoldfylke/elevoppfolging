<script lang="ts">
  import { slide } from "svelte/transition"
  import { enhance } from "$app/forms"
  import type { StudentDocument } from "$lib/types/db/shared-types"
  import type { ActionData } from "../../../routes/students/[_id]/$types"
  import DocumentContent from "./DocumentContent.svelte"
  import Message from "./Message.svelte"

  type PageProps = {
    document: StudentDocument
    form: ActionData
  }

  let { document, form }: PageProps = $props()

  let documentOpen = $state(false)
  let messageType: "update" | "comment" | null = $state(null)
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
        <DocumentContent editMode={false} {form} content={document.content} />
      </div>
      {#if document.messages.length > 0}
        <div class="document-messages">
          {#each document.messages as message}
            <Message {message} />
          {/each}
        </div>
      {/if}
      <div class="document-actions">
        {#if messageType === null}
          <button onclick={() => messageType = "update"}>Oppdatering</button>
          <button onclick={() => messageType = "comment"}>Kommentar</button>
        {:else if messageType === "update"}
          <div class="document-update">
            <div class="document-update-header">
              <div>Ny oppdatering</div>
            </div>
            <textarea placeholder="Skriv en oppdatering..."></textarea>
            <div class="document-update-actions">
              <button>Send</button>
              <button onclick={() => messageType = null}>Avbryt</button>
            </div>
          </div>
        {:else if messageType === "comment"}
          <form method="POST" action="?/newMessageAction" use:enhance>
            <input type="hidden" name="documentId" value={document._id} />
            <input type="hidden" name="type" value="comment" />
            <input type="text" name="comment" placeholder="Skriv en kommentar..." />
            <button type="submit">Send</button>
            <button onclick={() => messageType = null}>Avbryt</button>
          </form>
        {/if}
        {#if form?.createMessageFailedData?.[document._id]?.errorMessage}<p class="error">{form?.createMessageFailedData?.[document._id]?.errorMessage}</p>{/if}
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
  .document-update {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .document-update-header, .document-update-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>