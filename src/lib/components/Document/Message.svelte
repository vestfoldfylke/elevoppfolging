<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
    import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants";
    import type { NoSlashString } from "$lib/types/api/api-route-map";
  import type { DocumentMessage, DocumentMessageInput } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"

  type PageProps = {
    documentId: string
    message: DocumentMessage
    editMode: boolean
    studentId?: string
    groupId?: string
    callback?: () => void
  }

  let { documentId, message, editMode, studentId, groupId, callback }: PageProps = $props()

  let savedEditableMessage: DocumentMessageInput = $derived.by(() => {
    switch (message.type) {
      case "comment":
        return {
          type: "comment",
          content: {
            text: message.content.text
          }
        }
      case "update":
        return {
          type: "update",
          content: {
            title: message.content.title,
            text: message.content.text
          }
        }
    }
  })

  // svelte-ignore state_referenced_locally (we dont want to modify the original)
  let editableMessage: DocumentMessageInput = $state(savedEditableMessage)

  let messageForm: HTMLFormElement | undefined = $state()

  const callBackOnSuccessOrCancel = () => {
    editableMessage = $state.snapshot(savedEditableMessage)
    if (callback) {
      callback()
    }
    editMode = false
  }

  const newMessage = async (): Promise<void> => {
    if (!messageForm) {
      throw new Error("Message form not found")
    }
    const formIsValid = messageForm.reportValidity()
    if (!formIsValid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (groupId) {
      throw new Error("Creating messages for groups is not supported yet")
    }
    if (!groupId && !studentId) {
      throw new Error("studentId or groupId must be provided")
    }

    const createMessageRoute = `/api/students/${(studentId as NoSlashString)}/documents/${(documentId as NoSlashString)}/messages` as const

    await apiFetch(createMessageRoute, {
      method: "POST",
      body: editableMessage,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
</script>

<div class="message">
  {#if message.type === "comment"}
    <div class="message-icon">
      <span class="material-symbols-outlined">comment</span>
    </div>
  {/if}
  {#if message.type === "update"}
    <div class="message-icon">
      <span class="material-symbols-outlined">info</span>
    </div>
  {/if}
  <div class="message-content">
    {#if editMode}
      <form bind:this={messageForm}>
        {#if editableMessage.type === "update"}
          <h3>Ny oppdatering</h3>
          <div class="input-item">
            <label for="update-title">Tittel<span class="required-indicator">*</span></label>
            <input id="update-title" required name="messageTitle" type="text" bind:value={editableMessage.content.title} placeholder="Tittel på oppdatering" />
          </div>
          <div class="input-item">
            <label for="update-content">Oppdatering<span class="required-indicator">*</span></label>
            <textarea required name="messageContent" id="update-content" rows={5} bind:value={editableMessage.content.text} placeholder="Skriv oppdateringen her..."></textarea>
          </div>
        {/if}

        {#if editableMessage.type === "comment"}
          <h3>Ny kommentar</h3>
          <div class="input-item">
            <textarea rows="1" required name="messageContent" id="messageContent" bind:value={editableMessage.content.text} placeholder="Skriv kommentaren her..."></textarea>
          </div>
        {/if}
      </form>
    {:else}
      <!-- TODO: Find a better way to show who created the message. Fetch name from Users or do it on load? -->
      {#if message.type === "update"}
        <div class="update-header">
          <h3>Oppdatering: {message.content.title}</h3>
          <div class="message-metadata"><strong>{message.created.by.fallbackName}</strong> - <span class="created-at">{new Date(message.created.at).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })}</span></div>
        </div>
        <p class="message-text">{message.content.text}</p>
      {/if}
      
      {#if message.type === "comment"}
        <div class="message-metadata">
          <strong>{message.created.by.fallbackName}</strong> - <span class="created-at">{new Date(message.created.at).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })}</span>
        </div>
        <p class="message-text">{message.content.text}</p>
      {/if}
    {/if}
  </div>
</div>
<div class="message-actions">
  {#if editMode}
    <AsyncButton buttonText="Lagre" onClick={newMessage} reloadPageDataOnSuccess={true} callBackAfterReloadPageData={callBackOnSuccessOrCancel} classList={["filled"]} iconName="save" />
    <button class="filled danger" onclick={callBackOnSuccessOrCancel}><span class="material-symbols-outlined">close</span>Avbryt</button>
  {/if}
</div>

<style>
  .message {
    display: flex;
    gap: 1rem;
    border-bottom: 0px solid var(--color-primary-30);
    padding: 1rem 1rem 0 1rem;
  }

  .update-header {
    padding-bottom: 1rem;
  }

  .message-metadata {
    font-size: smaller;
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

  .message-content {
    flex: 1;
  }

  .message-text {
    white-space: pre-wrap;
    font: inherit;
    margin: 0;
  }

  .message-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: 0 1rem 1rem 1rem;
  }
</style>