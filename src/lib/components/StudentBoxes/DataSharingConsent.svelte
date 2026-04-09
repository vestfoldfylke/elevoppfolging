<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { FrontendStudent, StudentUnavailableSchoolDocuments } from "$lib/types/app-types"
  import type { StudentDataSharingConsent, StudentDataSharingConsentInput } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"
    import EditorInfo from "../EditorInfo.svelte";

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
  const savedEditableSharingConsent: StudentDataSharingConsentInput = $derived.by(() => {
    return {
      consent: studentDataSharingConsent?.consent ?? false,
      message: studentDataSharingConsent?.message ?? ""
    }
  })

  // svelte-ignore state_referenced_locally - det går bra, vi ønsker en lokal kopi
  let editableSharingConsent: StudentDataSharingConsentInput = $state(savedEditableSharingConsent)

  let hasMadeChanges = $derived.by(() => {
    return JSON.stringify(savedEditableSharingConsent) !== JSON.stringify(editableSharingConsent)
  })

  const updateStudentDataSharingConsent = async (): Promise<void> => {
    if (!consentForm) {
      throw new Error("Consent form not found")
    }
    const valid = consentForm.reportValidity()
    if (!valid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    await apiFetch(`/api/students/${student._id as NoSlashString}/consent`, {
      method: "PATCH",
      body: editableSharingConsent,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
</script>

<div class="ds-card" data-variant="tinted" data-color="brand1">
  <div class="card-header">
    <div class="card-title">
      <span class="material-symbols-outlined">handshake</span>
      <h2 class="ds-heading">Skolesamarbeid</h2>
    </div>
    <div class="card-header-actions">
      {#if canEdit && !editMode}
        <button class="ds-button" data-variant="secondary" data-size="sm" type="button" onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
      {/if}
    </div>
  </div>

  <div>
    {#if editMode}
      <form bind:this={consentForm}>
        <ds-field class="ds-field">
          <input id="sharing-consent-checkbox" class="ds-input" type="checkbox" bind:checked={editableSharingConsent.consent} />
          <label class="ds-label" data-weight="regular" for="sharing-consent-checkbox">Eleven har samtykket til deling av notater på tvers av skoler</label>
          <!--<div data-field="description">Description</div>-->
        </ds-field>
        <br />

        <ds-field class="ds-field">
          <label class="ds-label" data-weight="medium" for="sharing-consent-message">Dokumentasjon</label>
          <div data-field="description">
            Hvor er samtykket dokumentert, eventuelt annen relevant informasjon om samtykket
          </div>
          <textarea id="sharing-consent-message" rows="4" bind:value={editableSharingConsent.message} class="ds-input"></textarea>
        </ds-field>
      </form>
    {:else}
      <p class="ds-paragraph">Eleven har {savedEditableSharingConsent.consent ? "samtykket til deling av data" : "ikke samtykket til deling av data"}</p>
      {#if savedEditableSharingConsent.message}
        <h3 class="ds-heading" data-size="xs">Dokumentasjon</h3>
        <p class="ds-paragraph">{savedEditableSharingConsent.message}</p>
      {/if}

      {#if unavailableSchoolDocuments.length > 0}
        <p class="ds-paragraph">Det finnes dokumenter fra følgende skoler som ikke er tilgjengelige for deg:</p>
        <ul class="ds-list">
          {#each unavailableSchoolDocuments as unavailableSchoolDocument}
            <li>{unavailableSchoolDocument.school.name} - {unavailableSchoolDocument.numberOfDocuments} dokument{unavailableSchoolDocument.numberOfDocuments > 1 ? "er" : ""}</li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
  {#if editMode}
    <div class="card-footer-actions">
      <AsyncButton disabled={!hasMadeChanges} onClick={() => updateStudentDataSharingConsent()} reloadPageDataOnSuccess={true} buttonText="Lagre" iconName="save" callBackAfterReloadPageData={() => { editMode = false }} />
      <button class="ds-button" data-variant="secondary" type="button" onclick={() => { editMode = false; editableSharingConsent = $state.snapshot(savedEditableSharingConsent); }}><span class="material-symbols-outlined">close</span>Avbryt</button>
    </div>
  {:else}
    {#if studentDataSharingConsent?.modified && !editMode}
      <div class="card-footer-actions">
        <EditorInfo created={studentDataSharingConsent.modified} modified={studentDataSharingConsent.modified} />
      </div>
    {/if}
  {/if}
</div>

<style>
  h3 {
    margin: var(--ds-size-2) 0;
  }

  .ds-card {
    flex: 1;
    min-width: 20rem;
  }

</style>