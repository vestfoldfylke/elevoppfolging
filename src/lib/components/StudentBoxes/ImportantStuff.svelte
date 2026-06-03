<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { createEditableDraft, type EditableDraft } from "$lib/runes/create-editable-draft.svelte"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { FrontendStudent } from "$lib/types/app-types"
  import type { SchoolInfo, StudentCheckBox, StudentImportantStuff, StudentImportantStuffInput } from "$lib/types/db/shared-types"
  import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"
  import AsyncButton, { type AsyncButtonResult } from "../AsyncButton.svelte"
  import EditorInfo from "../EditorInfo.svelte"

  type ImportantStuffProps = {
    canEdit: boolean
    student: FrontendStudent
    importantStuff: StudentImportantStuff | null
    school: SchoolInfo
    studentCheckBoxes: StudentCheckBox[]
  }

  let { canEdit, student, importantStuff, school, studentCheckBoxes }: ImportantStuffProps = $props()

  let editMode = $state(false)
  let importantStuffForm: HTMLFormElement | undefined = $state()

  let importantStuffSource: StudentImportantStuffInput = $derived.by(() => ({
    school,
    importantInfo: importantStuff?.importantInfo || "",
    facilitation: importantStuff?.facilitation.filter((facilitationId) => studentCheckBoxes.find((checkbox) => checkbox._id === facilitationId && checkbox.enabled)) || [],
    followUp: importantStuff?.followUp.filter((followUpId) => studentCheckBoxes.find((checkbox) => checkbox._id === followUpId && checkbox.enabled)) || []
  }))

  let editableImportantStuff: EditableDraft<StudentImportantStuffInput> = createEditableDraft(() => importantStuffSource)

  const getStudentCheckBoxValues = (checkboxIds: string[]): string[] => {
    return checkboxIds
      .map((id) => studentCheckBoxes.find((checkbox) => checkbox._id === id))
      .filter((checkbox): checkbox is StudentCheckBox => checkbox !== undefined)
      .sort((a, b) => a.sort - b.sort)
      .map((checkbox) => checkbox.value)
  }

  const updateStudentImportantStuff = async (): Promise<AsyncButtonResult> => {
    if (!importantStuffForm) {
      return { status: "error", message: "Important stuff form not found" }
    }
    const valid = importantStuffForm.reportValidity()
    if (!valid) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    await apiFetch(`/api/students/${student._id as NoSlashString}/importantstuff`, {
      method: "PATCH",
      body: editableImportantStuff.draft,
      headers: {
        "Content-Type": "application/json"
      }
    })

    return {
      status: "success",
      reloadPageData: true,
      callBack: () => {
        editMode = false
      }
    }
  }
</script>

<div class="ds-card" data-variant="tinted" data-color="accent">
  <div class="card-header">
    <div class="card-title">
      <span class="material-symbols-outlined">star</span>
      <h2 class="ds-heading">Viktig informasjon ({school.name})</h2>
    </div>
    <div class="card-header-actions">
      {#if canEdit && !editMode}
        <button class="ds-button" data-variant="secondary" data-size="sm" type="button" onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
      {/if}
    </div>
  </div>
  <form bind:this={importantStuffForm}>
    <div class="important-stuff-content">
      <div class="important-info">
        <h3 class="ds-heading" data-size="xs">Informasjon</h3>
        {#if editMode}
          <ds-field class="ds-field">
            <div data-field="description">
              Skriv inn informasjon som eleven har godtatt at deles
            </div>
            <textarea rows="5" bind:value={editableImportantStuff.draft.importantInfo} class="ds-input"></textarea>
          </ds-field>
        {:else}
          <p class="ds-paragraph important-info-text">
            {importantStuffSource.importantInfo || "Ingen informasjon lagt til"}
          </p>
        {/if}
      </div>

      <div class="checkboxes-container">
        <div class="checkboxes">
          <h3 class="ds-heading" data-size="xs">{STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.single}</h3>
          {#if editMode}
            <fieldset class="ds-fieldset">
              {#each studentCheckBoxes.filter(checkbox => checkbox.enabled && checkbox.type === "FOLLOW_UP") as followUpCheckbox}
                <ds-field class="ds-field">
                  <input id={followUpCheckbox._id} class="ds-input" type="checkbox" bind:group={editableImportantStuff.draft.followUp} value={followUpCheckbox._id} />
                  <label for={followUpCheckbox._id} class="ds-label" data-weight="regular">{followUpCheckbox.value}</label>
                </ds-field>
              {/each}
            </fieldset>
          {:else}
            {#if importantStuffSource.followUp.length === 0}
              Ingen {STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.plural.toLowerCase()}
            {:else}
              <ul class="ds-list">
                {#each getStudentCheckBoxValues(importantStuffSource.followUp) as followUpValue}
                  <li>{followUpValue}</li>
                {/each}
              </ul>
            {/if}
          {/if}
        </div>

        <div class="checkboxes">
          <h3 class="ds-heading" data-size="xs">{STUDENT_CHECKBOX_DISPLAY_NAMES.FACILITATION.plural}</h3>
          {#if editMode}
            <fieldset class="ds-fieldset">
              {#each studentCheckBoxes.filter(checkbox => checkbox.enabled && checkbox.type === "FACILITATION") as facilitationCheckbox}
                <ds-field class="ds-field">
                  <input id={facilitationCheckbox._id} class="ds-input" type="checkbox" bind:group={editableImportantStuff.draft.facilitation} value={facilitationCheckbox._id} />
                  <label for={facilitationCheckbox._id} class="ds-label" data-weight="regular">{facilitationCheckbox.value}</label>
                </ds-field>
              {/each}
            </fieldset>
          {:else}
            {#if importantStuffSource.facilitation.length === 0}
              Ingen {STUDENT_CHECKBOX_DISPLAY_NAMES.FACILITATION.plural.toLowerCase()}
            {:else}
              <ul class="ds-list">
                {#each getStudentCheckBoxValues(importantStuffSource.facilitation) as facilitationValue}
                  <li>{facilitationValue}</li>
                {/each}
              </ul>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </form>

  {#if editMode}
    <div class="card-footer-actions">
      <AsyncButton disabled={!editableImportantStuff.isDirty} onClick={updateStudentImportantStuff} buttonText="Lagre" iconName="save" />
      <button class="ds-button" data-variant="secondary" type="button" onclick={() => { editMode = false; editableImportantStuff.cancel() }}><span class="material-symbols-outlined">close</span>Avbryt</button>
    </div>
  {:else}
    {#if importantStuff?.modified && !editMode}
      <div class="card-footer-actions">
        <EditorInfo editorInfo={importantStuff.modified} />
      </div>
    {/if}
  {/if}
</div>

<style>
  h3 {
    margin: var(--ds-size-2) 0;
  }

  .important-stuff-content {
    display: flex;
    column-gap: 2rem;
    row-gap: 1rem;
  }

  .important-info {
    flex: 1.2;
  }

  .important-info-text {
    white-space: pre-wrap;
  }

  .checkboxes-container {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
  }
  .checkboxes {
    min-width: 12rem;
    flex: 1;
  }

  ul > li {
    margin: 0;
  }

  @media (max-width: 60rem) {
    .important-stuff-content {
      flex-direction: column;
    }
  }
</style>