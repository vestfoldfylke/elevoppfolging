<script lang="ts">
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { canEditDocumentMessage, isOnlySubjectTeacher } from "$lib/shared-authorization/authorization"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { StudentAccessPerson } from "$lib/types/app-types"
  import type { DocumentMessage, DocumentMessageInput, StudentDocument } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"
  import PrincipalAccessTags from "../PrincipalAccessTags.svelte"

  type PageProps = {
    document: StudentDocument // Eller Group når det kommer
    message: DocumentMessage
    editMode: boolean
    studentDataSharingConsent?: boolean
    studentAccessPersons?: StudentAccessPerson[]
    emailAlertAvailable?: boolean
    callback?: () => void
  }

  let { document, message, editMode, studentDataSharingConsent, studentAccessPersons, emailAlertAvailable, callback }: PageProps = $props()

  // svelte-ignore state_referenced_locally (we don't want to modify the original), remember key on the outside
  let editableMessage: DocumentMessageInput = $state({
    type: message.type,
    content: {
      title: message.content.title,
      text: message.content.text
    },
    emailAlertReceivers: message.emailAlertReceivers || []
  })

  let messageEdited = $derived.by(() => {
    return editableMessage.type !== message.type || editableMessage.content.title !== message.content.title || editableMessage.content.text !== message.content.text
  })

  let alertableAccessPersons = $derived.by(() => {
    if (!emailAlertAvailable || !studentAccessPersons) {
      return []
    }

    const accessPersonsWithRelevantSchoolAccess = studentAccessPersons
      .map((accessPerson: StudentAccessPerson) => {
        return {
          ...accessPerson,
          principalAccessForStudent: studentDataSharingConsent
            ? accessPerson.principalAccessForStudent
            : accessPerson.principalAccessForStudent.filter((access) => access.schoolNumber === document.school.schoolNumber)
        }
      })
      .filter((accessPerson) => accessPerson.principalAccessForStudent.length > 0)

    const alertableAccessPersons = accessPersonsWithRelevantSchoolAccess.filter((accessPerson) => {
      if (document.documentAccess === "ALL_WITH_STUDENT_ACCESS") {
        return true
      }
      return !isOnlySubjectTeacher(accessPerson.principalAccessForStudent)
    })

    return alertableAccessPersons
  })

  let messageForm: HTMLFormElement | undefined = $state()

  const callBackOnSuccessOrCancel = () => {
    editableMessage = {
      type: message.type,
      content: {
        title: message.content.title,
        text: message.content.text
      },
      emailAlertReceivers: message.emailAlertReceivers || []
    }
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

    if (!document.student._id) {
      throw new Error("Group documents are not supported yet, studentId is missing")
    }

    const createMessageRoute = `/api/students/${document.student._id as NoSlashString}/documents/${document._id as NoSlashString}/messages` as const

    await apiFetch(createMessageRoute, {
      method: "POST",
      body: editableMessage,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const updateMessage = async (): Promise<void> => {
    if (!messageForm) {
      throw new Error("Message form not found")
    }
    const formIsValid = messageForm.reportValidity()
    if (!formIsValid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!document.student._id) {
      throw new Error("Group documents are not supported yet, studentId is missing")
    }
    if (!message.messageId) {
      throw new Error("messageId is required to update a message")
    }

    const updateMessageRoute = `/api/students/${document.student._id as NoSlashString}/documents/${document._id as NoSlashString}/messages/${message.messageId as NoSlashString}` as const

    await apiFetch(updateMessageRoute, {
      method: "PATCH",
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
          <label for="message-title-{message.messageId || document._id}" class="ds-label" data-weight="medium">
            Tittel
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <input autocomplete="off" class="ds-input" type="text" id="message-title-{message.messageId || document._id}" name="messageTitle" required bind:value={editableMessage.content.title} placeholder="Tittel på oppfølging" />
        </ds-field>
        
        <ds-field class="ds-field content-item">
          <label for="message-content-{message.messageId || document._id}" class="ds-label" data-weight="medium">
            Oppdatering
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <textarea required class="ds-input" name="messageContent" id="message-content-{message.messageId || document._id}" rows={5} bind:value={editableMessage.content.text} placeholder="Skriv oppdateringen her..."></textarea>
        </ds-field>
      {/if}

      <hr aria-hidden="true" class="ds-divider"/>

      {#if emailAlertAvailable && alertableAccessPersons.length > 0}
        <fieldset class="ds-fieldset content-item">
          <legend class="ds-label" data-weight="medium">
            Følgende personer skal varsles på e-post når notatet lagres
            <span class="ds-tag" data-variant="outline" data-color="warning" data-size="xs" style="margin-left: var(--ds-size-1)">Obs! Denne gjør ingenting enda, bare for testing</span>
          </legend>

          {#each alertableAccessPersons as alertableAccessPerson}
            <ds-field class="ds-field">
              <input id="email-alert-{message.messageId}-{document._id}-{alertableAccessPerson.entra.id}" class="ds-input" type="checkbox" name="email-alert-{document._id}" value={alertableAccessPerson.entra.userPrincipalName} bind:group={editableMessage.emailAlertReceivers} />
              <label for="email-alert-{message.messageId}-{document._id}-{alertableAccessPerson.entra.id}" class="ds-label" data-weight="regular">
                {alertableAccessPerson.entra.displayName}
                <PrincipalAccessTags principalAccessForStudent={alertableAccessPerson.principalAccessForStudent} />
              </label>
            </ds-field>
          {/each}
        </fieldset>
      {/if}

    </form>
  {:else}
    <p class="ds-paragraph pre-wrap-whitespace content-item">
      {message.content.text}
    </p>
  {/if}
</div>
{#if editMode}
  <div class="message-actions">
    {#if !message.messageId}
      <AsyncButton buttonText="Lagre" onClick={newMessage} reloadPageDataOnSuccess={true} callBackAfterReloadPageData={callBackOnSuccessOrCancel} iconName="save" />
    {:else}
      <AsyncButton disabled={!messageEdited} buttonText="Lagre endringer" onClick={updateMessage} reloadPageDataOnSuccess={true} callBackAfterReloadPageData={callBackOnSuccessOrCancel} iconName="save" />
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