<script lang="ts">
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { canEditDocumentMessage } from "$lib/shared-authorization/authorization"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
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

    const createMessageRoute = `/api/students/${studentId as NoSlashString}/documents/${documentId as NoSlashString}/messages` as const

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
  {#if editMode}
    <form bind:this={messageForm}>
      {#if editableMessage.type === "update"}
        {#if !message.messageId}
          <h2 class="ds-heading">Ny oppfølging</h2>
        {/if}
        <ds-field class="ds-field content-item">
          <label for="message-title-{message.messageId || documentId}" class="ds-label" data-weight="medium">
            Tittel
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <input autocomplete="off" class="ds-input" type="text" id="message-title-{message.messageId || documentId}" name="messageTitle" required bind:value={editableMessage.content.title} placeholder="Tittel på oppfølging" />
        </ds-field>
        
        <ds-field class="ds-field content-item">
          <label for="message-content-{message.messageId || documentId}" class="ds-label" data-weight="medium">
            Oppdatering
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <textarea required class="ds-input" name="messageContent" id="message-content-{message.messageId || documentId}" rows={5} bind:value={editableMessage.content.text} placeholder="Skriv oppdateringen her..."></textarea>
        </ds-field>
      {/if}
      <!--
      {#if editableMessage.type === "comment"}
        {#if !message.messageId}
          <h2 class="ds-heading">Ny kommentar</h2>
        {/if}
        <ds-field class="ds-field content-item">
          <label for="message-content-{message.messageId || documentId}" class="ds-label" data-weight="medium">
            Kommentar
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <input class="ds-input" required name="messageContent" id="message-content-{message.messageId || documentId}" type="text" bind:value={editableMessage.content.text} placeholder="Skriv kommentaren her..." />
        </ds-field>
      {/if}
      -->
    </form>
  {:else}
    <p class="ds-paragraph pre-wrap-whitespace">
      {message.content.text}
    </p>
  {/if}
</div>
{#if editMode}
  <div class="message-actions">
    {#if !message.messageId}
      <AsyncButton buttonText="Lagre" onClick={newMessage} reloadPageDataOnSuccess={true} callBackAfterReloadPageData={callBackOnSuccessOrCancel} iconName="save" />
    {:else}
      Lag "lagre endringer" knapp...
    {/if}
    <button class="ds-button" data-variant="secondary" onclick={callBackOnSuccessOrCancel}><span class="material-symbols-outlined">close</span>Avbryt</button>
  </div>
{:else if canEditDocumentMessage(page.data.authenticatedPrincipal, message)}
  <div class="message-actions">
    <button class="ds-button" data-variant="secondary" data-size="sm" onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
  </div>
{/if}

<style>
  .message-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .pre-wrap-whitespace {
    white-space: pre-wrap;
  }
</style>