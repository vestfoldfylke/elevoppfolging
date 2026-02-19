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
      return
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
  {#if editMode}
    <form bind:this={messageForm}>
      {#if editableMessage.type === "update"}
        <input type="text" name="updateTitle" bind:value={editableMessage.content.title} />
      {/if}
      <textarea required name="messageContent" id="messageContent" rows={3} bind:value={editableMessage.content.text}></textarea>
    </form>
  {:else}
    {#if editableMessage.type === "update"}
      <h3>{editableMessage.content.title}</h3>
    {/if}
    <p>{editableMessage.content.text}</p>
    <!-- TODO: Find a better way to show who created the message. Fetch name from Users or do it on load? -->
    <p>— {editableMessage.created.by.fallbackName}</p>
  {/if}
  
  <div class="message-actions">
    {#if editMode}
      <AsyncButton buttonText="LAGRE" onClick={newMessage} reloadPageDataOnSuccess={true} />
    {/if}
  </div>

</div>

<style>

</style>