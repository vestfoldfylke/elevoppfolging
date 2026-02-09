<script lang="ts">
	import { slide } from "svelte/transition"
	import { enhance } from "$app/forms"
	import type { StudentDocument } from "$lib/types/db/shared-types"
	import type { ActionData } from "../../../routes/students/[_id]/$types"
	import Message from "./Message.svelte"
    import { getInitialsFromName } from "$lib/utils/name-stuff";

	type PageProps = {
		document: StudentDocument
		form: ActionData
	}

	let { document, form }: PageProps = $props()

	let documentOpen = $state(false)
	let messageType: "UPDATE" | "COMMENT" | null = $state(null)
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
        {document.content.text}
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
          <div class="person-badge">
            {getInitialsFromName("Per Person")}
          </div>
          <button onclick={() => messageType = "UPDATE"}>Oppdatering</button>
          <button onclick={() => messageType = "COMMENT"}>Kommentar</button>
        {:else if messageType === "UPDATE"}
          <div class="document-update">
            <div class="document-update-header">
              <div class="person-badge">
                PP
              </div>
              <div>Ny oppdatering</div>
            </div>
            <textarea placeholder="Skriv en oppdatering..." value={document.content.text}></textarea>
            <div class="document-update-actions">
              <button>Send</button>
              <button onclick={() => messageType = null}>Avbryt</button>
            </div>
          </div>
        {:else if messageType === "COMMENT"}
          <div class="person-badge">
            PP
          </div>
          <form method="POST" action="?/newMessageAction" use:enhance>
            <input type="hidden" name="documentId" value={document._id} />
            <input type="hidden" name="type" value="COMMENT" />
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
  .person-badge {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: #007bff;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
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