<script lang="ts">
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton from "$lib/components/AsyncButton.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import { nameValidation, ssnValidation } from "$lib/data-validation/manual-student-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { canManageManualStudentsOnSchool } from "$lib/shared-authorization/authorization"
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

  // new manual student
  let updateManualStudentForm: HTMLFormElement | undefined = $state()
  let updateManualStudentFnr: string = $derived.by(() => data.manualStudent.ssn)
  let updateManualStudentName: string = $derived.by(() => data.manualStudent.name)

  const updateManualStudent = async (): Promise<void> => {
    if (!updateManualStudentForm?.reportValidity()) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!updateManualStudentFnr) {
      throw new Error("Fødselsnummer må våre fylt ut")
    }

    if (!updateManualStudentName) {
      throw new Error("Navn må våre fylt ut")
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
  }

  let canManageManualStudents = $derived.by(() => {
    if (!data.principalAccess) {
      return false
    }

    return canManageManualStudentsOnSchool(data.principalAccess, currentSchool.schoolNumber)
  })

  const abortUpdateManualStudent = () => {
    console.log("Meh")
  }
</script>

<div class="page-content">
  <PageHeader title={data.manualStudent.name} />
  
  {#if canManageManualStudents}
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

      <div class="manual-student-actions">
        <AsyncButton onClick={updateManualStudent} buttonText="Oppdater manuell elev" iconName="update" reloadPageDataOnSuccess={true} />
        <button class="ds-button" type="button" data-variant="secondary" onclick={abortUpdateManualStudent}><span class="material-symbols-outlined">close</span>Avbryt</button>
      </div>
    </div>
  {/if}
</div>

<style>  
  .manual-student-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
  }
</style>
