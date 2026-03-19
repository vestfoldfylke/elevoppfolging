<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { FrontendStudent } from "$lib/types/app-types"
  import type { SchoolInfo, StudentCheckBox, StudentImportantStuff, StudentImportantStuffInput } from "$lib/types/db/shared-types"
  import { prettifyDate } from "$lib/utils/prettify-date"
  import AsyncButton from "../AsyncButton.svelte"

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

<div class="section-box">
  <div class="section-box-header">
    <div class="section-box-header-title">
      <span class="material-symbols-outlined">star</span>
      <h3>Viktig informasjon ved {school.name}</h3>
    </div>
    <div class="section-box-header-actions">
      {#if canEdit && !editMode}
        <button onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
      {/if}
    </div>
  </div>

  <div class="section-box-content">
    <form bind:this={importantStuffForm}>
      <div class="important-stuff-content">
        <div class="important-info">
          <h4>Informasjon</h4>
          {#if editMode}
            <textarea rows="4" style="width: 100%" bind:value={editableImportantStuff.importantInfo} placeholder="Skriv viktig informasjon om eleven som er relevant for skolen"></textarea>
          {:else}
            <div class="important-info-text">
              {savedEditableImportantStuff.importantInfo || "Ingen informasjon lagt til"}
            </div>
          {/if}
        </div>

        <div class="checkboxes-container">
          <div class="checkboxes">
            <h4 class="checkbox-header">Oppfølging</h4>
            {#if editMode}
              <ul class="edit-checkbox-list">
                {#each studentCheckBoxes.filter(checkbox => checkbox.enabled && checkbox.type === "FOLLOW_UP") as followUpCheckbox}
                    <li>
                      <label>
                        <input type="checkbox" id={followUpCheckbox._id} bind:group={editableImportantStuff.followUp} value={followUpCheckbox._id} />
                        {followUpCheckbox.value}
                      </label>
                    </li>
                {/each}
              </ul>
            {:else}
              {#if savedEditableImportantStuff.followUp.length === 0}
                Ingen oppfølging
              {:else}
                <ul>
                  {#each savedEditableImportantStuff.followUp || [] as followUpId}
                    <li>{studentCheckBoxes.find(checkbox => checkbox._id === followUpId)?.value}</li>
                  {/each}
                </ul>
              {/if}
            {/if}
          </div>

          <div class="checkboxes">
            <h4>Tilrettelegging</h4>
            {#if editMode}
              <ul class="edit-checkbox-list"> 
                {#each studentCheckBoxes.filter(checkbox => checkbox.enabled && checkbox.type === "FACILITATION") as facilitationCheckbox}
                    <li>  
                      <label>
                        <input type="checkbox" id={facilitationCheckbox._id} bind:group={editableImportantStuff.facilitation} value={facilitationCheckbox._id} />
                        {facilitationCheckbox.value}
                      </label>
                    </li>
                {/each}
              </ul>
            {:else}
              {#if savedEditableImportantStuff.facilitation.length === 0}
                Ingen tilrettelegging
              {:else}
                <ul>
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
  </div>
  {#if editMode}
    <div class="section-box-footer">
      <AsyncButton disabled={!hasMadeChanges} onClick={() => updateStudentImportantStuff()} reloadPageDataOnSuccess={true} buttonText="Lagre" classList={["filled"]} iconName="save" callBackAfterReloadPageData={() => { editMode = false }} />
      <button type="button" onclick={() => { editMode = false; editableImportantStuff = $state.snapshot(savedEditableImportantStuff); }}><span class="material-symbols-outlined">close</span>Avbryt</button>
    </div>
  {:else}
    {#if importantStuff?.modified && !editMode}
      <div class="section-box-footer">
        <span>{prettifyDate(importantStuff.modified.at)} av {importantStuff.modified.by.fallbackName}</span>
      </div>
    {/if}
  {/if}
</div>

<style>
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
  .edit-checkbox-list {
    padding-left: 0;
  }
  .edit-checkbox-list > li {
    list-style-type: none;
  }

  @media (max-width: 60rem) {
    .important-stuff-content {
      flex-direction: column;
    }
  }
</style>