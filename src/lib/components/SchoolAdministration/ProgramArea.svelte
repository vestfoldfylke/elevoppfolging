<script lang="ts">
  import type { DSSuggestionElement } from "@digdir/designsystemet-web"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { nameValidation } from "$lib/data-validation/program-area-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { createEditableDraft, type EditableDraft } from "$lib/runes/create-editable-draft.svelte"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { AccessControlClass } from "$lib/types/app-types"
  import type { ProgramArea, ProgramAreaInput } from "$lib/types/db/shared-types"
  import AsyncButton, { type AsyncButtonResult } from "../AsyncButton.svelte"

  type ProgramAreaProps = {
    programArea?: ProgramArea | undefined
    schoolClasses: AccessControlClass[]
    schoolNumber: string
    editMode?: boolean
  }

  let { programArea = undefined, schoolClasses, schoolNumber, editMode = $bindable(false) }: ProgramAreaProps = $props()

  let editableProgramArea: EditableDraft<{ name: string }> = createEditableDraft(() => {
    return { name: programArea?.name || "" }
  })

  let classesChanged = $state(false)
  let classesSuggestionElement: DSSuggestionElement | undefined = $state()
  let programAreaForm: HTMLFormElement | undefined = $state()

  let nonExistingProgramAreas: string[] = $derived.by(() => {
    if (!programArea) {
      return []
    }

    return programArea.classes.filter((classGroup) => !schoolClasses.some((schoolClass: AccessControlClass) => schoolClass.systemId === classGroup.systemId)).map((classGroup) => classGroup.systemId)
  })

  const programAreaHasBeenEdited = (): void => {
    if (!programArea || !classesSuggestionElement) {
      classesChanged = false
      return
    }

    const selectedClassIds = classesSuggestionElement.values
    const originalClassIds = programArea.classes?.map((classGroup) => classGroup.systemId) || []
    classesChanged = selectedClassIds.length !== originalClassIds.length || !selectedClassIds.every((id) => originalClassIds.includes(id))
  }

  const validateAndGetProgramAreaInput = (): ProgramAreaInput => {
    if (!programAreaForm?.reportValidity()) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!editableProgramArea.draft.name) {
      throw new Error("Navn på gruppering av klasser må være fylt ut")
    }

    if (!classesSuggestionElement) {
      throw new Error("Mangler referanse til klasser input - kan ikke hente ut valgte klasser")
    }

    return {
      name: editableProgramArea.draft.name,
      classes: classesSuggestionElement.values
        .map((value) => {
          const matchingClass = schoolClasses.find((classGroup) => classGroup.systemId === value)
          if (!matchingClass) {
            console.warn("Klasse med systemId", value, "ikke funnet. Den vil bli fjernet fra denne grupperingen av klasser", editableProgramArea.draft.name)
            return null
          }

          return {
            systemId: matchingClass.systemId,
            fallbackName: matchingClass.name
          }
        })
        .filter((value) => value !== null),
      schoolNumber
    }
  }

  const createProgramArea = async (): Promise<AsyncButtonResult> => {
    const newProgramAreaInput = validateAndGetProgramAreaInput()

    await apiFetch(`/api/programareas`, {
      method: "POST",
      body: newProgramAreaInput,
      headers: {
        "Content-Type": "application/json"
      }
    })

    return { status: "success", reloadPageData: true, callBack: closeEditMode }
  }

  const updateProgramArea = async (): Promise<AsyncButtonResult> => {
    if (!programArea) {
      return { status: "error", message: "Kan ikke oppdatere gruppering av klasser uten å vite hvilken gruppering av klasser det er snakk om" }
    }

    const updatedProgramAreaInput = validateAndGetProgramAreaInput()

    await apiFetch(`/api/programareas/${programArea._id as NoSlashString}`, {
      method: "PATCH",
      body: updatedProgramAreaInput,
      headers: {
        "Content-Type": "application/json"
      }
    })

    return { status: "success", reloadPageData: true, callBack: closeEditMode }
  }

  const deleteProgramArea = async (): Promise<AsyncButtonResult> => {
    if (!programArea) {
      return { status: "error", message: "Kan ikke slette gruppering av klasser uten å vite hvilken gruppering av klasser det er snakk om" }
    }

    await apiFetch(`/api/programareas/${programArea._id as NoSlashString}`, {
      method: "DELETE"
    })

    return { status: "success", reloadPageData: true, callBack: closeEditMode }
  }

  const closeEditMode = (): void => {
    editMode = false
    editableProgramArea.cancel()
    classesChanged = false
  }
</script>

<div class="ds-card content-item">
  <div class="program-area-header">
    <h3 class="ds-heading" data-size="xs">{programArea?.name || "Ny gruppering av klasser"}</h3>
    {#if programArea && !editMode}
      <button class="ds-button" data-variant="secondary" onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger gruppering av klasser</button>
    {/if}
  </div>

  {#if editMode}
    <form bind:this={programAreaForm}>
      <ds-field class="ds-field content-item">
        <label class="ds-label" data-weight="medium" for="program-area-name">
          Navn på gruppering av klasser
          <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
        </label>
        <div class="ds-field-affixes">
          <input class="ds-input" type="text" id="program-area-name" maxlength={nameValidation.maxLength} minlength={nameValidation.minLength} pattern={nameValidation.pattern.source} bind:value={editableProgramArea.draft.name} required>
        </div>
      </ds-field>

      <ds-field class="ds-field">
        <label class="ds-label" data-weight="medium" for="classes">
          Klasser i grupperingen
        </label>
        <ds-suggestion bind:this={classesSuggestionElement} data-multiple="" class="ds-suggestion" /* @ts-expect-error (oncomboboxafterselect exists and works...) */ oncomboboxafterselect={programAreaHasBeenEdited}>
          {#if programArea}
            {#each programArea.classes as selectedClassGroup}
              {#if nonExistingProgramAreas.some((nonExistingSystemId: string) => nonExistingSystemId === selectedClassGroup.systemId)}
                <data value={selectedClassGroup.systemId} class="program-area-class-nonexisting">{selectedClassGroup.fallbackName}</data>
              {:else}
                <data value={selectedClassGroup.systemId}>{selectedClassGroup.fallbackName}</data>
              {/if}
            {/each}
          {/if}
          <input id="classes" class="ds-input" type="text" placeholder="" />
          <del aria-label="Tøm" hidden=""></del>
          <u-datalist
            data-sr-plural="%d forslag"
            data-sr-singular="%d forslag"
            role="listbox"
          >
            {#each schoolClasses as classGroup}
              <u-option value={classGroup.systemId}>{classGroup.name}</u-option>
            {/each}
          </u-datalist>
        </ds-suggestion>
      </ds-field>
    </form>

    {#if programArea && nonExistingProgramAreas.length > 0}
      <div class="ds-alert" data-color="info">
        <h2 class="ds-heading" data-size="xs">{nonExistingProgramAreas.length} {nonExistingProgramAreas.length > 1 ? "utgåtte klasser" : "utgått klasse"}</h2>
        <p class="ds-paragraph" data-variant="default">
          Klasser merket i rødt eksisterer ikke lenger på skolen eller har fått ny intern id og vil automatisk bli fjernet fra denne grupperingen av klasser ved lagring. Legg til klassen på nytt dersom klassen skal være med i denne grupperingen av klasser. Dette skjer typisk ved nytt skoleår.
        </p>
      </div>
    {/if}

    <div class="program-area-actions">
      {#if programArea}
        <AsyncButton disabled={!editableProgramArea.isDirty && !classesChanged && nonExistingProgramAreas.length === 0} onClick={updateProgramArea} buttonText="Lagre endringer" iconName="save" />
        <AsyncButton onClick={deleteProgramArea} buttonText="Slett gruppering av klasser" iconName="delete" color="danger" />
      {:else}
        <AsyncButton onClick={createProgramArea} buttonText="Opprett gruppering av klasser" iconName="save" />
      {/if}
      <button class="ds-button" data-variant="secondary" onclick={closeEditMode}><span class="material-symbols-outlined">close</span>Avbryt</button>
    </div>

  {:else if programArea}
    <div class="content-item">
      <ul class="ds-list">
        {#each programArea.classes || [] as classGroup}
          <li>{classGroup.fallbackName}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>


<style>
.ds-heading {
  margin-bottom: var(--ds-size-2);
}

.program-area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.program-area-class-nonexisting {
  background: var(--ds-color-danger-base-default);
}

.program-area-actions {
  display: flex;
  gap: var(--ds-size-2);
  margin-top: var(--ds-size-4);
}
  
</style>