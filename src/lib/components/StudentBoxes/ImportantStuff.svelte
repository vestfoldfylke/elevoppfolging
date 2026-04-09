<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { FrontendStudent } from "$lib/types/app-types"
  import type { SchoolInfo, StudentCheckBox, StudentImportantStuff, StudentImportantStuffInput } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"
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

  let savedEditableImportantStuff: StudentImportantStuffInput = $derived.by(() => {
    return {
      school: school,
      importantInfo: importantStuff?.importantInfo || "",
      facilitation: importantStuff?.facilitation.filter((facilitationId) => studentCheckBoxes.find((checkbox) => checkbox._id === facilitationId && checkbox.enabled)) || [],
      followUp: importantStuff?.followUp.filter((followUpId) => studentCheckBoxes.find((checkbox) => checkbox._id === followUpId && checkbox.enabled)) || []
    }
  })

  // svelte-ignore state_referenced_locally - det går bra, vi håndterer intern state i klassen EditableImportantStuffHandler
  let editableImportantStuff: StudentImportantStuffInput = $state(savedEditableImportantStuff)

  let hasMadeChanges = $derived.by(() => {
    return JSON.stringify(savedEditableImportantStuff) !== JSON.stringify(editableImportantStuff)
  })

  const updateStudentImportantStuff = async (): Promise<void> => {
    if (!importantStuffForm) {
      throw new Error("Important stuff form not found")
    }
    const valid = importantStuffForm.reportValidity()
    if (!valid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    await apiFetch(`/api/students/${student._id as NoSlashString}/importantstuff`, {
      method: "PATCH",
      body: editableImportantStuff,
      headers: {
        "Content-Type": "application/json"
      }
    })
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
            <textarea rows="5" bind:value={editableImportantStuff.importantInfo} class="ds-input"></textarea>
          </ds-field>
        {:else}
          <p class="ds-paragraph important-info-text">
            {savedEditableImportantStuff.importantInfo || "Ingen informasjon lagt til"}
          </p>
        {/if}
      </div>

      <div class="checkboxes-container">
        <div class="checkboxes">
          <h3 class="ds-heading" data-size="xs">Oppfølging</h3>
          {#if editMode}
            <fieldset class="ds-fieldset">
              {#each studentCheckBoxes.filter(checkbox => checkbox.enabled && checkbox.type === "FOLLOW_UP") as followUpCheckbox}
                <ds-field class="ds-field">
                  <input id={followUpCheckbox._id} class="ds-input" type="checkbox" bind:group={editableImportantStuff.followUp} value={followUpCheckbox._id} />
                  <label for={followUpCheckbox._id} class="ds-label" data-weight="regular">{followUpCheckbox.value}</label>
                </ds-field>
              {/each}
            </fieldset>
          {:else}
            {#if savedEditableImportantStuff.followUp.length === 0}
              Ingen oppfølging
            {:else}
              <ul class="ds-list">
                {#each savedEditableImportantStuff.followUp || [] as followUpId}
                  <li>{studentCheckBoxes.find(checkbox => checkbox._id === followUpId)?.value}</li>
                {/each}
              </ul>
            {/if}
          {/if}
        </div>

        <div class="checkboxes">
          <h3 class="ds-heading" data-size="xs">Tilrettelegging</h3>
          {#if editMode}
            <fieldset class="ds-fieldset">
              {#each studentCheckBoxes.filter(checkbox => checkbox.enabled && checkbox.type === "FACILITATION") as facilitationCheckbox}
                <ds-field class="ds-field">
                  <input id={facilitationCheckbox._id} class="ds-input" type="checkbox" bind:group={editableImportantStuff.facilitation} value={facilitationCheckbox._id} />
                  <label for={facilitationCheckbox._id} class="ds-label" data-weight="regular">{facilitationCheckbox.value}</label>
                </ds-field>
              {/each}
            </fieldset>
          {:else}
            {#if savedEditableImportantStuff.facilitation.length === 0}
              Ingen tilrettelegging
            {:else}
              <ul class="ds-list">
                {#each savedEditableImportantStuff.facilitation || [] as facilitationId}
                  <li>{studentCheckBoxes.find(checkbox => checkbox._id === facilitationId)?.value}</li>
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
      <AsyncButton disabled={!hasMadeChanges} onClick={() => updateStudentImportantStuff()} reloadPageDataOnSuccess={true} buttonText="Lagre" iconName="save" callBackAfterReloadPageData={() => { editMode = false }} />
      <button class="ds-button" data-variant="secondary" type="button" onclick={() => { editMode = false; editableImportantStuff = $state.snapshot(savedEditableImportantStuff); }}><span class="material-symbols-outlined">close</span>Avbryt</button>
    </div>
  {:else}
    {#if importantStuff?.modified && !editMode}
      <div class="card-footer-actions">
        <EditorInfo created={importantStuff.created} modified={importantStuff.modified} />
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