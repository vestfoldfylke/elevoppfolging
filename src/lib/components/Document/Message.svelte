<script lang="ts">
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { createEditableDraft, type EditableDraft } from "$lib/runes/create-editable-draft.svelte"
  import { authorizeEditMessageInGroupDocument, authorizeEditMessageInStudentDocument } from "$lib/shared-authorization/authorization"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { StudentAccessPerson } from "$lib/types/app-types"
  import type { DocumentMessage, DocumentMessageInput, GroupDocument, StudentDocument } from "$lib/types/db/shared-types"
  import AsyncButton, { type AsyncButtonResult } from "../AsyncButton.svelte"
  import EditorInfo from "../EditorInfo.svelte"
  import EmailAlertSelector from "./EmailAlertSelector.svelte"

  type PageProps = {
    document: StudentDocument | GroupDocument
    message: DocumentMessage
    editMode: boolean
    studentDataSharingConsent?: boolean
    studentAccessPersons?: StudentAccessPerson[]
    emailAlertAvailable?: boolean
    callback?: () => void
  }

  let { document, message, editMode, studentDataSharingConsent, studentAccessPersons, emailAlertAvailable, callback }: PageProps = $props()

  let messageSource: DocumentMessageInput = $derived.by(() => {
    return {
      type: message.type,
      content: {
        title: message.content.title,
        text: message.content.text
      },
      emailAlertReceivers: message.emailAlertReceivers || []
    }
  })

  let editableMessage: EditableDraft<DocumentMessageInput> = createEditableDraft(() => messageSource)

  let canEditMessage: boolean = $derived.by(() => {
    if ("group" in document) {
      return authorizeEditMessageInGroupDocument({ authenticatedPrincipal: page.data.authenticatedPrincipal, document, message }).authorized
    }

    if ("student" in document) {
      return authorizeEditMessageInStudentDocument({ authenticatedPrincipal: page.data.authenticatedPrincipal, document, message }).authorized
    }

    return false
  })

  let messageForm: HTMLFormElement | undefined = $state()

  const callBackOnSuccessOrCancel = () => {
    editableMessage.cancel()

    if (callback) {
      callback()
    }

    editMode = false
  }

  const newMessage = async (): Promise<AsyncButtonResult> => {
    if (!messageForm) {
      return { status: "error", message: "Message form not found" }
    }

    const formIsValid = messageForm.reportValidity()
    if (!formIsValid) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    if ("group" in document) {
      const createMessageRoute = `/api/classes/${document.group.systemId as NoSlashString}/documents/${document._id as NoSlashString}/messages` as const

      await apiFetch(createMessageRoute, {
        method: "POST",
        body: editableMessage.draft,
        headers: {
          "Content-Type": "application/json"
        }
      })

      return { status: "success", reloadPageData: true, callBack: callBackOnSuccessOrCancel }
    }

    if ("student" in document) {
      const createMessageRoute = `/api/students/${document.student._id as NoSlashString}/documents/${document._id as NoSlashString}/messages` as const

      await apiFetch(createMessageRoute, {
        method: "POST",
        body: editableMessage.draft,
        headers: {
          "Content-Type": "application/json"
        }
      })
    }

    return { status: "success", reloadPageData: true, callBack: callBackOnSuccessOrCancel }
  }

  const updateMessage = async (): Promise<AsyncButtonResult> => {
    if (!messageForm) {
      return { status: "error", message: "Message form not found" }
    }

    const formIsValid = messageForm.reportValidity()
    if (!formIsValid) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    if (!message.messageId) {
      return { status: "error", message: "messageId is required to update a message" }
    }

    if ("group" in document) {
      const updateMessageRoute = `/api/classes/${document.group.systemId as NoSlashString}/documents/${document._id as NoSlashString}/messages/${message.messageId as NoSlashString}` as const

      await apiFetch(updateMessageRoute, {
        method: "PATCH",
        body: editableMessage.draft,
        headers: {
          "Content-Type": "application/json"
        }
      })

      return { status: "success", reloadPageData: true, callBack: callBackOnSuccessOrCancel }
    }

    if ("student" in document) {
      const updateMessageRoute = `/api/students/${document.student._id as NoSlashString}/documents/${document._id as NoSlashString}/messages/${message.messageId as NoSlashString}` as const

      await apiFetch(updateMessageRoute, {
        method: "PATCH",
        body: editableMessage.draft,
        headers: {
          "Content-Type": "application/json"
        }
      })
    }

    return { status: "success", reloadPageData: true, callBack: callBackOnSuccessOrCancel }
  }
</script>

<div class="message">

  <div class="message-header-tags">
    <span class="ds-tag" data-color="accent">
      <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">chat_info</span>
      {message.messageId ? "Oppdatering" : "Ny oppdatering"}
    </span>
  </div>

  {#if editMode}
    <form bind:this={messageForm}>
      {#if editableMessage.draft.type === "update"}
        <ds-field class="ds-field content-item">
          <label for="message-title-{message.messageId || document._id}" class="ds-label" data-weight="medium">
            Tittel
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <input autocomplete="off" class="ds-input" type="text" id="message-title-{message.messageId || document._id}" name="messageTitle" required bind:value={editableMessage.draft.content.title} />
        </ds-field>
        
        <ds-field class="ds-field content-item">
          <label for="message-content-{message.messageId || document._id}" class="ds-label" data-weight="medium">
            Oppdatering
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <textarea required class="ds-input" name="messageContent" id="message-content-{message.messageId || document._id}" rows={5} bind:value={editableMessage.draft.content.text}></textarea>
        </ds-field>
      {/if}

      {#if emailAlertAvailable && studentAccessPersons}
        <hr aria-hidden="true" class="ds-divider"/>

        <EmailAlertSelector
          id="email-alert-{message.messageId}-{document._id}"
          legendText="Følgende personer skal varsles på e-post når oppdateringen lagres"
          {studentAccessPersons}
          {studentDataSharingConsent}
          schoolNumber={document.school.schoolNumber}
          documentAccess={document.documentAccess}
          bind:emailAlertReceivers={editableMessage.draft.emailAlertReceivers}
        />
      {/if}
    </form>
  {:else}
    <h2 class="ds-heading" data-size="xs">{message.content.title}</h2>
    <EditorInfo editorInfo={message.created} isEdited={message.modified.at.getTime() > message.created.at.getTime()} timestamp={true} modifiedIndicator={true} />
    
    <p class="ds-paragraph pre-wrap-whitespace content-item">
      {message.content.text}
    </p>
  {/if}
</div>
{#if editMode}
  <div class="message-actions">
    {#if !message.messageId}
      <AsyncButton buttonText="Lagre" onClick={newMessage} iconName="save" />
    {:else}
      <AsyncButton disabled={!editableMessage.isDirty} buttonText="Lagre endringer" onClick={updateMessage} iconName="save" />
    {/if}
    <button class="ds-button" data-variant="secondary" onclick={callBackOnSuccessOrCancel}><span class="material-symbols-outlined">close</span>Avbryt</button>
  </div>
{:else if canEditMessage || (message.emailAlertReceivers && message.emailAlertReceivers.length > 0)}
  <div class="message-footer">
    <div class="message-info">
      {#if message.emailAlertReceivers && message.emailAlertReceivers.length > 0}
        <span class="ds-tag" data-color="neutral" data-variant="outline" data-size="sm">
          <span class="material-symbols-outlined" style="margin-right: var(--ds-size-2);">mail</span>
          <button data-popover="inline" popoverTarget="email-receivers-{document._id}-{message.messageId}">{message.emailAlertReceivers.length} person{message.emailAlertReceivers.length > 1 ? "er" : ""}</button>&nbsp;varslet på e-post
        </span>

        <div id="email-receivers-{document._id}-{message.messageId}" class="ds-popover" popover="auto" data-placement="top">
          {#each message.emailAlertReceivers as emailReceiver}
            <p class="ds-paragraph" data-size="xs">{emailReceiver}</p>
          {/each}
        </div>
      {/if}
    </div>
    
    {#if canEditMessage && !document.isDocumentLocked}
      <button class="ds-button" data-variant="secondary" data-size="sm" onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
    {/if}
  </div>
{/if}

<style>
  .message-header-tags {
    margin-bottom: var(--ds-size-2);
  }

  .message-footer {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
  }

  .message-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .pre-wrap-whitespace {
    white-space: pre-wrap;
  }
</style>