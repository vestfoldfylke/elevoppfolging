<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { FrontendStudent, StudentUnavailableSchoolDocuments } from "$lib/types/app-types"
  import type { StudentDataSharingConsent } from "$lib/types/db/shared-types"
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
  let consentMessage = $state(studentDataSharingConsent?.message ?? "")
  // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounter ved endring av student
  let consentValue = $state(studentDataSharingConsent?.consent ?? false)

  const updateStudentDataSharingConsent = async (): Promise<void> => {
    if (!consentForm) {
      throw new Error("Consent form not found")
    }
    const valid = consentForm.reportValidity()
    if (!valid) {
      throw new Error("Vennligst fyll ut alle påkrevde felt før du lagrer")
    }

    await apiFetch(`/api/students/${student._id}/consent`, {
      method: "PATCH",
      body: {
        consent: consentValue,
        message: consentMessage
      },
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
</script>

<div class="student-section">
  <div class="student-section-header">
    <h3>Skolesamarbeid</h3>
    {#if canEdit && !editMode}
      <button onclick={() => editMode = true}>Rediger</button>
    {/if}
  </div>
  <div class="student-section-content">
    {#if editMode}
      <form bind:this={consentForm}>
        <label>
          <input type="checkbox" bind:checked={consentValue}>
          Samtykke til deling av data
        </label>
        <br>
        <label>
          Samtykkemelding:
          <br>
          <textarea bind:value={consentMessage} placeholder="Skriv en melding som forklarer hvorfor samtykke er gitt eller trukket tilbake" required></textarea>
        </label>
      </form>
      <AsyncButton onClick={() => updateStudentDataSharingConsent()} reloadPageDataOnSuccess={true} buttonText="Lagre" classList={["filled"]} iconName="save" callBackAfterReloadPageData={() => { editMode = false }} />
      <button type="button" onclick={() => editMode = false}>Avbryt</button>
    {:else}
      <p>Redigert av: {studentDataSharingConsent?.modified.by.fallbackName}</p>
      <p>Eleven har {studentDataSharingConsent?.consent ? "samtykket til deling av data" : "ikke samtykket til deling av data"}</p>
      <p>{studentDataSharingConsent?.message}</p>
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
</div>

<style>

</style>