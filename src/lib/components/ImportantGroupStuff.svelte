<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { createEditableDraft, type EditableDraft } from "$lib/runes/create-editable-draft.svelte"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { ClassGroup, GroupImportantStuff, GroupImportantStuffInput, SchoolInfo } from "$lib/types/db/shared-types"
  import AsyncButton, { type AsyncButtonResult } from "./AsyncButton.svelte"
  import EditorInfo from "./EditorInfo.svelte"

  type GroupImportantStuffProps = {
    canEdit: boolean
    group: ClassGroup
    groupImportantStuff: GroupImportantStuff | null
    school: SchoolInfo
  }

  let { canEdit, group, groupImportantStuff, school }: GroupImportantStuffProps = $props()

  let editMode = $state(false)
  let groupImportantStuffForm: HTMLFormElement | undefined = $state()

  let groupImportantStuffSource: GroupImportantStuffInput = $derived.by(() => ({
    school,
    importantInfo: groupImportantStuff?.importantInfo || ""
  }))

  let editableGroupImportantStuff: EditableDraft<GroupImportantStuffInput> = createEditableDraft(() => groupImportantStuffSource)

  const updateGroupImportantStuff = async (): Promise<AsyncButtonResult> => {
    if (!groupImportantStuffForm) {
      return { status: "error", message: "Important stuff form not found" }
    }

    const valid = groupImportantStuffForm.reportValidity()
    if (!valid) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    await apiFetch(`/api/classes/${group.systemId as NoSlashString}/importantstuff`, {
      method: "PATCH",
      body: editableGroupImportantStuff.draft,
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
      <h2 class="ds-heading">Viktig informasjon</h2>
    </div>
    <div class="card-header-actions">
      {#if canEdit && !editMode}
        <button class="ds-button" data-variant="secondary" data-size="sm" type="button" onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
      {/if}
    </div>
  </div>
  <form bind:this={groupImportantStuffForm}>
    <div class="important-stuff-content">
      <div class="important-info">
        <h3 class="ds-heading" data-size="xs">Informasjon</h3>
        {#if editMode}
          <ds-field class="ds-field">
            <div data-field="description">
              Skriv inn informasjon om klassen. NB! Ikke personlig informasjon om enkeltelever. Teksten skrives inn av kontaktlærer, rådgiver eller leder.
            </div>
            <textarea rows="5" bind:value={editableGroupImportantStuff.draft.importantInfo} class="ds-input"></textarea>
          </ds-field>
        {:else}
          <p class="ds-paragraph important-info-text">
            {groupImportantStuffSource.importantInfo || "Ingen informasjon lagt til"}
          </p>
        {/if}
      </div>
    </div>
  </form>

  {#if editMode}
    <div class="card-footer-actions">
      <AsyncButton disabled={!editableGroupImportantStuff.isDirty} onClick={updateGroupImportantStuff} buttonText="Lagre" iconName="save" />
      <button class="ds-button" data-variant="secondary" type="button" onclick={() => { editMode = false; editableGroupImportantStuff.cancel() }}><span class="material-symbols-outlined">close</span>Avbryt</button>
    </div>
  {:else}
    {#if groupImportantStuff?.modified && !editMode}
      <div class="card-footer-actions">
        <EditorInfo editorInfo={groupImportantStuff.modified} />
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

  @media (max-width: 60rem) {
    .important-stuff-content {
      flex-direction: column;
    }
  }
</style>