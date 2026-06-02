<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton, { type AsyncButtonResult } from "$lib/components/AsyncButton.svelte"
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

  const newSchool = async (): Promise<AsyncButtonResult> => {
    if (!newSchoolForm) {
      return { status: 'error', message: "New school form not found" }
    }

    const formIsValid = newSchoolForm.reportValidity()
    if (!formIsValid) {
      return { status: 'error', message: INVALID_FORM_MESSAGE }
    }

    await apiFetch("/api/schools", {
      method: "POST",
      body: newSchoolData,
      headers: {
        "Content-Type": "application/json"
      }
    })

    return { status: 'success', reloadPageData: true, callBack: () => { newSchoolOpen = false } }
  }
</script>

<div class="page-content">
  <PageHeader title="Skoleadministrasjon" />

  {#if !newSchoolOpen}
    <div class="header-with-action">
      <button class="ds-button" onclick={() => newSchoolOpen = true}><span class="material-symbols-outlined">add</span>Opprett ny skole</button>
    </div>
  {:else}
    <h2 class="ds-heading">Legg til ny skole</h2>
  {/if}

  <div class="add-school">
    {#if newSchoolOpen}
      <form bind:this={newSchoolForm}>
        <ds-field class="ds-field content-item">
          <label class="ds-label" data-weight="medium" for="schoolName">
            Skolenavn
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <div class="ds-field-affixes">
            <input class="ds-input" id="schoolName" name="schoolName" type="text" bind:value={newSchoolData.name} required pattern={schoolNameValidation.pattern.source} minlength={schoolNameValidation.minLength} maxlength={schoolNameValidation.maxLength}>
          </div>
        </ds-field>
        <ds-field class="ds-field content-item">
          <label class="ds-label" data-weight="medium" for="schoolNumber">
            Skolenummer
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <div class="ds-field-affixes">
            <input class="ds-input" id="schoolNumber" name="schoolNumber" type="text" bind:value={newSchoolData.schoolNumber} required pattern={schoolNumberValidation.pattern.source} minlength={schoolNumberValidation.minLength} maxlength={schoolNumberValidation.maxLength}>
          </div>
        </ds-field>
      </form>

      <div class="new-school-actions">
        <AsyncButton onClick={newSchool} buttonText="Legg til ny skole" iconName="add" />
        <button class="ds-button" type="button" data-variant="secondary" onclick={() => newSchoolOpen = false}>
          <span class="material-symbols-outlined">close</span>
          Avbryt
        </button>
      </div>
    {/if}
  </div>

  <div class="schools">
    {#if data.schools.length > 0}
      <table class="ds-table">
        <thead>
          <tr>
            <th>Skolenavn</th>
            <th>Skolenummer</th>
            <th>Kilde</th>
          </tr>
        </thead>
        <tbody>
          {#each data.schools as school}
            <tr>
              <td>
                <a href={`/system/schools/${school.schoolNumber}`} class="ds-link" rel="noopener noreferrer">{school.name}</a>
              </td>
              <td>{school.schoolNumber}</td>
              <td>{school.source}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      Ingen skoler å se her
    {/if}
  </div>
</div>

<style>
  .header-with-action {
    display: flex;
    justify-content: flex-end;
  }

  .new-school-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .schools {
    margin-top: var(--ds-size-4);
  }
</style>
