<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { DocumentMessage } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"

  type PageProps = {
    documentId: string
    message: DocumentMessage
    editMode: boolean
    callback?: () => void
  }

  let { documentId, message, editMode, callback }: PageProps = $props()

  // svelte-ignore state_referenced_locally (we dont want to modify the original)
  let editableMessage: DocumentMessage = $state(message)

  let messageForm: HTMLFormElement | undefined = $state()

  const newMessage = async (): Promise<void> => {
    if (!messageForm) {
      throw new Error("Message form not found")
    }
    const formIsValid = messageForm.reportValidity()
    if (!formIsValid) {
      throw new Error("Mangler påkrevd felt")
    }

    await apiFetch(`/api/documents/${documentId}/messages`, {
      method: "POST",
      body: editableMessage,
      headers: {
        "Content-Type": "application/json"
      }
    })

    editMode = false
    if (callback) {
      callback()
    }
  }
</script>

<div class="message">
  <div class="message-icon">
    <span class="material-symbols-outlined">feedback</span>
  </div>
  <div>
    {#if editMode}
      <form bind:this={messageForm}>
        <textarea required name="messageContent" id="messageContent" rows={3} bind:value={editableMessage.content.text}></textarea>
      </form>
    {:else}
      <!-- TODO: Find a better way to show who created the message. Fetch name from Users or do it on load? -->
      <div class="message-header">
        <strong>{message.created.by.fallbackName}</strong> - <span class="created-at">{new Date(message.created.at).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })}</span>
      </div>
      <pre class="message-text">{editableMessage.content.text}</pre>
    {/if}
    
    <div class="message-actions">
      {#if editMode}
        <AsyncButton buttonText="LAGRE" onClick={newMessage} reloadPageDataOnSuccess={true} />
      {/if}
    </div>
  </div>
</div>

<style>
  .message {
    margin: 1.5rem 0rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .message-header {
    font-size: 0.9rem;
  }
  .message-icon > span {
    color: var(--color-primary);
    background-color: var(--color-primary-20);
    border-radius: 50%;
    padding: 0.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .message-text {
    white-space: pre-wrap;
    font: inherit;
    margin: 0;
  }
</style>