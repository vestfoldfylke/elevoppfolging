<script lang="ts">
  import type { DSSuggestionElement } from "@digdir/designsystemet-web"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { nameValidation } from "$lib/data-validation/program-area-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { ProgramArea, ProgramAreaInput, StudentClassGroup } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"

  type ProgramAreaProps = {
    programArea?: ProgramArea | undefined
    schoolClasses: StudentClassGroup[]
    schoolNumber: string
    editMode?: boolean
  }

  let { programArea = undefined, schoolClasses, schoolNumber, editMode = $bindable(false) }: ProgramAreaProps = $props()

  // svelte-ignore state_referenced_locally - det går bra så lenge du har en key på _id utsida
  let editableProgramAreaName: string = $state(programArea?.name || "")
  let classesSuggestionElement: DSSuggestionElement | undefined = $state()
  let programAreaForm: HTMLFormElement | undefined = $state()

  let programAreaEdited = $state(false)

  const programAreaHasBeenEdited = (): void => {
    if (!programArea) {
      programAreaEdited = false
      return
    }

    const nameChanged = editableProgramAreaName !== programArea.name
    let classesChanged = false
    if (classesSuggestionElement) {
      const selectedClassIds = classesSuggestionElement.values
      const originalClassIds = programArea.classes?.map((classGroup) => classGroup.systemId) || []
      // Sjekk om de valgte klassene er forskjellige fra de originale
      classesChanged = selectedClassIds.length !== originalClassIds.length || !selectedClassIds.every((id) => originalClassIds.includes(id))
      console.log("Selected class IDs:", selectedClassIds)
    }

    programAreaEdited = nameChanged || classesChanged
  }

  const validateAndGetProgramAreaInput = (): ProgramAreaInput => {
    if (!programAreaForm?.reportValidity()) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!editableProgramAreaName) {
      throw new Error("Navn på programområde må være fylt ut")
    }

    if (!classesSuggestionElement) {
      throw new Error("Mangler referanse til klasser input - kan ikke hente ut valgte klasser")
    }

    return {
      name: editableProgramAreaName,
      classes: classesSuggestionElement.values.map((value) => {
        const matchingClass = schoolClasses.find((classGroup) => classGroup.systemId === value)
        if (!matchingClass) {
          throw new Error(`Fant ingen klasse med systemId ${value} - kan ikke opprette programområde`)
        }
        return {
          systemId: matchingClass.systemId,
          fallbackName: matchingClass.name
        }
      }),
      schoolNumber
    }
  }

  const createProgramArea = async (): Promise<void> => {
    const newProgramAreaInput = validateAndGetProgramAreaInput()

    await apiFetch(`/api/programareas`, {
      method: "POST",
      body: newProgramAreaInput,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const updateProgramArea = async (): Promise<void> => {
    if (!programArea) {
      throw new Error("Kan ikke oppdatere programområde uten å vite hvilket programområde det er snakk om")
    }

    const updatedProgramAreaInput = validateAndGetProgramAreaInput()

    await apiFetch(`/api/programareas/${programArea._id as NoSlashString}`, {
      method: "PATCH",
      body: updatedProgramAreaInput,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const deleteProgramArea = async (): Promise<void> => {
    if (!programArea) {
      throw new Error("Kan ikke slette programområde uten å vite hvilket programområde det er snakk om")
    }

    await apiFetch(`/api/programareas/${programArea._id as NoSlashString}`, {
      method: "DELETE"
    })
  }

  const closeEditMode = (): void => {
    editMode = false
    editableProgramAreaName = programArea?.name || ""
    programAreaEdited = false
  }
</script>

<div class="ds-card content-item">
  <div class="program-area-header">
    <h3 class="ds-heading" data-size="xs">{programArea?.name || "Nytt programområde"}</h3>
    {#if programArea && !editMode}
      <button class="ds-button" data-variant="secondary" onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger programområde</button>
    {/if}
  </div>

  {#if editMode}
    <form bind:this={programAreaForm}>
      <ds-field class="ds-field content-item">
        <label class="ds-label" data-weight="medium" for="program-area-name">
          Navn på programområde
          <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
        </label>
        <div class="ds-field-affixes">
          <input class="ds-input" type="text" id="program-area-name" maxlength={nameValidation.maxLength} minlength={nameValidation.minLength} pattern={nameValidation.pattern.source} bind:value={editableProgramAreaName} oninput={programAreaHasBeenEdited} required>
        </div>
      </ds-field>

      <ds-field class="ds-field">
        <label class="ds-label" data-weight="medium" for="classes">
          Klasser i programområdet
        </label>
        <ds-suggestion bind:this={classesSuggestionElement} data-multiple="" class="ds-suggestion" /* @ts-expect-error (oncomboboxafterselect exists and works...) */ oncomboboxafterselect={programAreaHasBeenEdited}>
          {#if programArea}
            {#each programArea.classes as selectedClassGroup}
              <data value={selectedClassGroup.systemId}>{selectedClassGroup.fallbackName}</data>
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

    <div class="program-area-actions">
      {#if programArea}
        <!-- TODO sjekk at det faktisk er endringer -->
        <AsyncButton disabled={!programAreaEdited} onClick={updateProgramArea} buttonText="Lagre endringer" iconName="save" reloadPageDataOnSuccess={true} callBackAfterReloadPageData={closeEditMode} />
        <AsyncButton onClick={deleteProgramArea} buttonText="Slett programområde" iconName="delete" color="danger" reloadPageDataOnSuccess={true} callBackAfterReloadPageData={closeEditMode} />
      {:else}
        <AsyncButton onClick={createProgramArea} buttonText="Opprett programområde" iconName="save" reloadPageDataOnSuccess={true} callBackAfterReloadPageData={closeEditMode} />
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

.program-area-actions {
  display: flex;
  gap: var(--ds-size-2);
  margin-top: var(--ds-size-4);
}
  
</style>