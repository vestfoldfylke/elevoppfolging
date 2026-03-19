<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton from "$lib/components/AsyncButton.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import { schoolNameValidation, schoolNumberValidation } from "$lib/data-validation/school-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { EditorData, NewSchool } from "$lib/types/db/shared-types"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let newSchoolOpen = $state(false)

  let newSchoolForm: HTMLFormElement | undefined = $state()

  const mockEditor: EditorData = {
    at: new Date(),
    by: {
      entraUserId: "samma",
      fallbackName: "samma"
    }
  }

  let newSchoolData: NewSchool = {
    name: "",
    schoolNumber: "",
    source: "MANUAL",
    created: mockEditor,
    modified: mockEditor
  }

  const newSchool = async (): Promise<void> => {
    if (!newSchoolForm) {
      throw new Error("New school form not found")
    }
    const formIsValid = newSchoolForm.reportValidity()
    if (!formIsValid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    await apiFetch("/api/schools", {
      method: "POST",
      body: newSchoolData,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
</script>

<div class="page-content">
  <PageHeader title="Skoleadministrasjon" />

  <div class="add-school">
    {#if !newSchoolOpen}
      <button onclick={() => newSchoolOpen = true}><span class="material-symbols-outlined">add</span>Opprett ny skole</button>
    {/if}
    {#if newSchoolOpen}
      <h2>Legg til ny skole</h2>
      <form bind:this={newSchoolForm}>
        <div class="form-group">
          <label for="schoolName">Skolenavn</label>
          <input id="schoolName" name="schoolName" type="text" bind:value={newSchoolData.name} required pattern={schoolNameValidation.pattern.source} minlength={schoolNameValidation.minLength} maxlength={schoolNameValidation.maxLength}>
        </div>
        <div class="form-group">
          <label for="schoolNumber">Skolenummer</label>
          <input id="schoolNumber" name="schoolNumber" type="text" bind:value={newSchoolData.schoolNumber} required pattern={schoolNumberValidation.pattern.source} minlength={schoolNumberValidation.minLength} maxlength={schoolNumberValidation.maxLength}>
        </div>
      </form>
      <div class="new-school-actions">
        <AsyncButton onClick={newSchool} buttonText="Legg til skole" reloadPageDataOnSuccess={true} classList={["filled"]} iconName="add" callBackAfterReloadPageData={() => newSchoolOpen = false} />
        <button onclick={() => newSchoolOpen = false} class="filled danger">Avbryt</button>
      </div>
    {/if}
  </div>

  <h2>Skoler</h2>

  {#each data.schools as school}
    <div class="school">
      <a href={`/system/schools/${school.schoolNumber}`}><h3>{school.name}</h3></a>
      <p>Skolenummer: {school.schoolNumber}</p>
      <p>Kilde: {school.source}</p>
    </div>
  {/each}
</div>


<style>
  .form-group {
    max-width: 20rem;
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
  }
  .new-school-actions {
    display: flex;
    gap: 1rem;
  }
</style>
