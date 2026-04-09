<script lang="ts">
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton from "$lib/components/AsyncButton.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import { nameValidation, ssnValidation } from "$lib/data-validation/manual-student-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { UpdateManualStudentInput } from "$lib/types/db/shared-types"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let currentSchool = $derived.by(() => {
    if (data.accessSchools.length === 0) {
      throw new Error("Ingen skoler funnet")
    }

    const school = data.accessSchools.find((school) => school.schoolNumber === page.params.schoolnumber)
    if (!school) {
      throw new Error("Skole ikke funnet")
    }

    return school
  })

  let updateManualStudentEdit: boolean = $state(false)
  let updateManualStudentForm: HTMLFormElement | undefined = $state()
  let updateManualStudentFnr: string = $derived.by(() => data.manualStudent.ssn)
  let updateManualStudentName: string = $derived.by(() => data.manualStudent.name)

  const updateManualStudent = async (): Promise<void> => {
    if (!updateManualStudentForm?.reportValidity()) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!updateManualStudentFnr) {
      throw new Error("Fødselsnummer må være fylt ut")
    }

    if (!updateManualStudentName) {
      throw new Error("Navn må være fylt ut")
    }

    const updateManualStudentInput: UpdateManualStudentInput = {
      ssn: updateManualStudentFnr,
      name: updateManualStudentName,
      school: currentSchool,
      studentId: data.manualStudent._id
    }

    await apiFetch(`/api/students/${data.manualStudent._id as NoSlashString}`, {
      method: "POST",
      body: updateManualStudentInput,
      headers: {
        "Content-Type": "application/json"
      }
    })

    updateManualStudentEdit = false
  }

  const abortUpdateManualStudent = () => {
    updateManualStudentEdit = false
    updateManualStudentFnr = data.manualStudent.ssn
    updateManualStudentName = data.manualStudent.name
  }
</script>

<div class="page-content">
  <div class="update-manual-student-link">
    <a href={`/schooladministration/${currentSchool.schoolNumber}?tab=manual`} class="ds-link" rel="noopener noreferrer">
      <span class="material-symbols-outlined">arrow_back</span>
      Tilbake til manuelle elever
    </a>
  </div>

  <PageHeader title={`Manuell elev - ${data.manualStudent.name}`} />

  {#if !updateManualStudentEdit}
    <div class="update-manual-student">
      <div>
        <h2 class="ds-heading">Fødselsnummer</h2>
        <p class="ds-paragraph">{updateManualStudentFnr}</p>
      </div>
      <div class="manual-student-edit-action">
        <button onclick={() => updateManualStudentEdit = true} class="ds-button">
          <span class="material-symbols-outlined">edit</span>
          Rediger
        </button>
      </div>
    </div>
  {:else}
    <div class="update-manual-student-form">
      <form bind:this={updateManualStudentForm}>
        <ds-field class="ds-field content-item">
          <label class="ds-label" data-weight="medium" for="fnr">
            Fødselsnummer
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <div class="ds-field-affixes">
            <input class="ds-input" inputmode="numeric" type="text" id="fnr" pattern={ssnValidation.pattern.source} minlength={ssnValidation.minLength} maxlength={ssnValidation.maxLength} bind:value={updateManualStudentFnr} required>
          </div>
        </ds-field>

        <ds-field class="ds-field content-item">
          <label class="ds-label" data-weight="medium" for="name">
            Navn
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <div class="ds-field-affixes">
            <input class="ds-input" type="text" id="name" pattern={nameValidation.pattern.source} minlength={nameValidation.minLength} maxlength={nameValidation.maxLength} bind:value={updateManualStudentName} required>
          </div>
        </ds-field>
      </form>

      <div class="manual-student-save-actions">
        <AsyncButton onClick={updateManualStudent} buttonText="Lagre" iconName="save" reloadPageDataOnSuccess={true} disabled={updateManualStudentFnr === data.manualStudent.ssn && updateManualStudentName === data.manualStudent.name} />
        <button class="ds-button" type="button" data-variant="secondary" onclick={abortUpdateManualStudent}><span class="material-symbols-outlined">close</span>Avbryt</button>
      </div>
    </div>
  {/if}
</div>

<style>  
  .update-manual-student-link {
      padding-bottom: var(--ds-size-4);
  }

  .manual-student-edit-action {
      padding-top: var(--ds-size-4);
  }

  .manual-student-save-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
  }
</style>
