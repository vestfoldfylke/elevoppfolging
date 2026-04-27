<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { ClassGroup, GroupImportantStuff, GroupImportantStuffInput, SchoolInfo } from "$lib/types/db/shared-types"
  import AsyncButton from "./AsyncButton.svelte"
  import EditorInfo from "./EditorInfo.svelte"

  type GroupImportantStuffProps = {
    group: ClassGroup
    groupImportantStuff: GroupImportantStuff | null
    school: SchoolInfo
  }

  let { group, groupImportantStuff, school }: GroupImportantStuffProps = $props()

  let editMode = $state(false)
  let groupImportantStuffForm: HTMLFormElement | undefined = $state()

  let savedEditableGroupImportantStuff: GroupImportantStuffInput = $derived.by(() => {
    return {
      school: school,
      importantInfo: groupImportantStuff?.importantInfo || ""
    }
  })

  // svelte-ignore state_referenced_locally - det går bra, vi håndterer intern state i klassen EditableGroupImportantStuffHandler
  let editableGroupImportantStuff: GroupImportantStuffInput = $state(savedEditableGroupImportantStuff)

  let hasMadeChanges = $derived.by(() => {
    return JSON.stringify(savedEditableGroupImportantStuff) !== JSON.stringify(editableGroupImportantStuff)
  })

  const updateGroupImportantStuff = async (): Promise<void> => {
    if (!groupImportantStuffForm) {
      throw new Error("Important stuff form not found")
    }

    const valid = groupImportantStuffForm.reportValidity()
    if (!valid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    await apiFetch(`/api/classes/${group.systemId as NoSlashString}/importantstuff`, {
      method: "PATCH",
      body: editableGroupImportantStuff,
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
      <h2 class="ds-heading">Viktig informasjon</h2>
    </div>
    <div class="card-header-actions">
      {#if !editMode}
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
              Skriv inn informasjon om klassen
            </div>
            <textarea rows="5" bind:value={editableGroupImportantStuff.importantInfo} class="ds-input"></textarea>
          </ds-field>
        {:else}
          <p class="ds-paragraph important-info-text">
            {savedEditableGroupImportantStuff.importantInfo || "Ingen informasjon lagt til"}
          </p>
        {/if}
      </div>
    </div>
  </form>

  {#if editMode}
    <div class="card-footer-actions">
      <AsyncButton disabled={!hasMadeChanges} onClick={() => updateGroupImportantStuff()} reloadPageDataOnSuccess={true} buttonText="Lagre" iconName="save" callBackAfterReloadPageData={() => { editMode = false }} />
      <button class="ds-button" data-variant="secondary" type="button" onclick={() => { editMode = false; editableGroupImportantStuff = $state.snapshot(savedEditableGroupImportantStuff); }}><span class="material-symbols-outlined">close</span>Avbryt</button>
    </div>
  {:else}
    {#if groupImportantStuff?.modified && !editMode}
      <div class="card-footer-actions">
        <EditorInfo created={groupImportantStuff.created} modified={groupImportantStuff.modified} />
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