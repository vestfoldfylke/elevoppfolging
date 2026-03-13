<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
    import { INVALID_FORM_MESSAGE } from "$lib/data-validation/constants";
    import { studentDataSharingConsentMessageValidation } from "$lib/data-validation/student-consent";
  import type { FrontendStudent, StudentUnavailableSchoolDocuments } from "$lib/types/app-types"
  import type { StudentDataSharingConsent, StudentDataSharingConsentInput } from "$lib/types/db/shared-types"
    import { prettifyDate } from "$lib/utils/prettify-date";
  import AsyncButton from "../AsyncButton.svelte"

  type DataSharingConsentProps = {
    canEdit: boolean
    student: FrontendStudent
    studentDataSharingConsent: StudentDataSharingConsent | null
    unavailableSchoolDocuments: StudentUnavailableSchoolDocuments[]
  }

  let { canEdit, student, studentDataSharingConsent, unavailableSchoolDocuments }: DataSharingConsentProps = $props()

  let editMode = $state(false)
  let consentForm: HTMLFormElement | undefined = $state()

  // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounter ved endring av student
  const initialEditableSharingConsent: StudentDataSharingConsentInput = {
    consent: studentDataSharingConsent?.consent ?? false,
    message: studentDataSharingConsent?.message ?? ""
  }

  let editableSharingConsent: StudentDataSharingConsentInput = $state(initialEditableSharingConsent)

  let hasMadeChanges = $derived.by(() => {
    return JSON.stringify(initialEditableSharingConsent) !== JSON.stringify(editableSharingConsent)
  })

  const updateStudentDataSharingConsent = async (): Promise<void> => {
    if (!consentForm) {
      throw new Error("Consent form not found")
    }
    const valid = consentForm.reportValidity()
    if (!valid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    await apiFetch(`/api/students/${student._id}/consent`, {
      method: "PATCH",
      body: editableSharingConsent,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
</script>

<div class="section-box data-sharing-consent">
  <div class="section-box-header">
    <div class="section-box-header-title">
      <span class="material-symbols-outlined">handshake</span>
      <h3>Skolesamarbeid</h3>
    </div>
    <div class="section-box-header-actions">
      {#if canEdit && !editMode}
        <button onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
      {/if}
    </div>
  </div>
  <div class="section-box-content">
    {#if editMode}
      <form bind:this={consentForm}>
        <label>
          <input type="checkbox" bind:checked={editableSharingConsent.consent}>
          Eleven har samtykket til deling av notater på tvers av skoler
        </label>
        <br />
        <br />
        <label>Melding
          <br />
          <textarea bind:value={editableSharingConsent.message} rows="4" style="width: 100%" placeholder="Skriv en melding som forklarer hvorfor samtykke er gitt eller trukket tilbake" required minlength={studentDataSharingConsentMessageValidation.minLength} maxlength={studentDataSharingConsentMessageValidation.maxLength}></textarea>
        </label>
        </form>
    {:else}
      <p>Eleven har {studentDataSharingConsent?.consent ? "samtykket til deling av data" : "ikke samtykket til deling av data"}</p>
      {#if studentDataSharingConsent?.message}
        <h4>Melding</h4>
        <div>{studentDataSharingConsent?.message}</div>
      {/if}
      {#if unavailableSchoolDocuments.length > 0}
        <p>Det finnes dokumenter fra følgende skoler som ikke er tilgjengelige for deg:</p>
        <ul>
          {#each unavailableSchoolDocuments as unavailableSchoolDocument}
            <li>{unavailableSchoolDocument.school.name} - {unavailableSchoolDocument.numberOfDocuments} dokument{unavailableSchoolDocument.numberOfDocuments > 1 ? "er" : ""}</li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
  {#if editMode}
    <div class="section-box-footer">
      <AsyncButton onClick={() => updateStudentDataSharingConsent()} reloadPageDataOnSuccess={true} buttonText="Lagre" classList={["filled"]} iconName="save" callBackAfterReloadPageData={() => { editMode = false }} />
      <button type="button" onclick={() => editMode = false}>Avbryt</button>
    </div>
  {:else}
    {#if studentDataSharingConsent?.modified && !editMode}
      <div class="section-box-footer">
        <span>{prettifyDate(studentDataSharingConsent.modified.at)} av {studentDataSharingConsent.modified.by.fallbackName}</span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .data-sharing-consent {
    min-width: 20rem;
  }

</style>