<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { studentCheckBoxValueValidation } from "$lib/data-validation/student-check-box-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { StudentCheckBox, StudentCheckBoxInput } from "$lib/types/db/shared-types"
  import { prettifyDateTime } from "$lib/utils/dates"
  import AsyncButton, { type AsyncButtonResult } from "./AsyncButton.svelte"

  type StudentCheckBoxProps = {
    checkBox: StudentCheckBox
    editMode: boolean
    name?: string
    callBackOnCreate?: () => void
    callBackOnCancel?: () => void
  }

  let { checkBox, editMode, name, callBackOnCreate, callBackOnCancel }: StudentCheckBoxProps = $props()

  // svelte-ignore state_referenced_locally - we want a local copy
  let editableCheckBox: StudentCheckBoxInput = $state({
    enabled: checkBox.enabled,
    type: checkBox.type,
    value: checkBox.value,
    sort: checkBox.sort
  } as StudentCheckBoxInput)

  let studentCheckBoxFormNew: HTMLFormElement | undefined = $state()
  let studentCheckBoxFormEditName: HTMLFormElement | undefined = $state()
  let studentCheckBoxFormEditSort: HTMLFormElement | undefined = $state()

  const cancelStudentCheckBox = (): void => {
    editMode = false

    if (callBackOnCancel) {
      callBackOnCancel()
    }
  }

  const createStudentCheckBox = async (): Promise<AsyncButtonResult> => {
    if (!studentCheckBoxFormNew) {
      return { status: "error", message: "Student new checkbox form not found" }
    }

    if (!studentCheckBoxFormNew.reportValidity()) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    await apiFetch("/api/studentcheckboxes", {
      method: "POST",
      body: editableCheckBox,
      headers: {
        "Content-Type": "application/json"
      }
    })

    return {
      status: "success",
      reloadPageData: true,
      callBack: () => {
        callBackOnCreate?.()
        editMode = false
      }
    }
  }

  const deleteStudentCheckBox = async (): Promise<AsyncButtonResult> => {
    if (!checkBox._id) {
      return { status: "error", message: "Mangler id for å kunne slette" }
    }

    const confirmation = confirm("Er du sikker på at du vil slette denne sjekkboksen? Den vil bli fjernet fra alle elever, og må legges til på nytt på hver elev dersom den skal legges til på nytt.")
    if (!confirmation) {
      return { status: "cancelled" }
    }

    await apiFetch(`/api/studentcheckboxes/${checkBox._id as NoSlashString}`, {
      method: "DELETE"
    })

    return {
      status: "success",
      reloadPageData: true,
      callBack: () => {
        callBackOnCreate?.()
        editMode = false
      }
    }
  }

  const updateStudentCheckBox = async (): Promise<AsyncButtonResult> => {
    if (!checkBox._id) {
      return { status: "error", message: "Mangler id for å kunne oppdatere" }
    }

    if (!studentCheckBoxFormEditName) {
      return { status: "error", message: "Student edit checkbox name form not found" }
    }

    if (!studentCheckBoxFormEditName.reportValidity()) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    if (!studentCheckBoxFormEditSort) {
      return { status: "error", message: "Student edit checkbox sort form not found" }
    }

    if (!studentCheckBoxFormEditSort.reportValidity()) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    await apiFetch(`/api/studentcheckboxes/${checkBox._id as NoSlashString}`, {
      method: "PATCH",
      body: editableCheckBox,
      headers: {
        "Content-Type": "application/json"
      }
    })

    return {
      status: "success",
      reloadPageData: true,
      callBack: () => {
        callBackOnCreate?.()
        editMode = false
      }
    }
  }
</script>

{#if typeof callBackOnCreate === "function" && editMode}
  <form bind:this={studentCheckBoxFormNew}>
    <div class="add-student-check-form">
      <h2 class="ds-heading">{name}</h2>

      <ds-field class="ds-field content-item">
        <label class="ds-label" data-weight="medium" for="studentCheckBoxName">
          Navn
          <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
        </label>
        <div class="ds-field-affixes">
          <input class="ds-input" id="studentCheckBoxName" type="text" bind:value={editableCheckBox.value} required minlength={studentCheckBoxValueValidation.minLength} maxlength={studentCheckBoxValueValidation.maxLength}>
        </div>
      </ds-field>

      <ds-field class="ds-field content-item">
        <label class="ds-label" data-weight="medium" for="studentCheckBoxSort">
          Sortering
          <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
        </label>
        <div class="ds-field-affixes">
          <input class="ds-input" id="studentCheckBoxSort" type="number" bind:value={editableCheckBox.sort} required>
        </div>
      </ds-field>

      <ds-field class="ds-field content-item">
        <label class="ds-label" data-weight="medium" for="studentCheckBoxEnabled" data-clickdelegatefor="studentCheckBoxEnabled">
          Aktiv
        </label>
        <input class="ds-input" type="checkbox" id="studentCheckBoxEnabled" bind:checked={editableCheckBox.enabled}>
      </ds-field>

      <div class="student_check_box_edit_actions">
        <AsyncButton onClick={createStudentCheckBox} buttonText="Opprett" iconName="add" />
        <button class="ds-button" type="button" data-variant="secondary" onclick={cancelStudentCheckBox}>Avbryt</button>
      </div>
    </div>
  </form>
{:else}
  <td>
    {#if editMode}
      <form bind:this={studentCheckBoxFormEditName}>
        <input class="ds-input" id="studentCheckBoxName" type="text" bind:value={editableCheckBox.value} required minlength={studentCheckBoxValueValidation.minLength} maxlength={studentCheckBoxValueValidation.maxLength}>
      </form>
    {:else}
      {checkBox.value}
    {/if}
  </td>
  <td>
    {#if editMode}
      <form bind:this={studentCheckBoxFormEditSort}>
        <input class="ds-input" id="studentCheckBoxSort" type="number" bind:value={editableCheckBox.sort} required>
      </form>
    {:else}
      {checkBox.sort}
    {/if}
  </td>
  <td>
    {#if editMode}
      <input class="ds-input" type="checkbox" id="studentCheckBoxEnabled" bind:checked={editableCheckBox.enabled}>
    {:else}
      {checkBox.enabled ? "Aktiv" : "Deaktivert (skjult)"}
    {/if}
  </td>
  <td>
    <span class="ds-tag" data-color="neutral" data-size="sm">
      <button data-popover="inline" popoverTarget="student-check-box-{checkBox._id}_created">{prettifyDateTime(checkBox.created.at)}</button>
    </span>
    <div id="student-check-box-{checkBox._id}_created" class="ds-popover" popover="auto" data-placement="top">
      {checkBox.created.by.fallbackName}
    </div>
  </td>
  <td>
    <span class="ds-tag" data-color="neutral" data-size="sm">
      <button data-popover="inline" popoverTarget="student-check-box-{checkBox._id}_modified">{prettifyDateTime(checkBox.modified.at)}</button>
    </span>
    <div id="student-check-box-{checkBox._id}_modified" class="ds-popover" popover="auto" data-placement="top">
      {checkBox.modified.by.fallbackName}
    </div>
  </td>
  <td>
    <div class="student_check_box_edit_actions">
      {#if !editMode}
        <button class="ds-button" type="button" data-size="sm" onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
        <AsyncButton onClick={deleteStudentCheckBox} buttonText="Slett" iconName="delete" dataSize="sm" color="danger" />
      {:else}
        <AsyncButton onClick={updateStudentCheckBox} buttonText="Lagre" iconName="save" dataSize="sm" />
        <button class="ds-button" type="button" data-size="sm" data-variant="secondary" onclick={cancelStudentCheckBox}>Avbryt</button>
      {/if}
    </div>
  </td>
{/if}

<style>
  .student_check_box_edit_actions {
    margin-top: var(--ds-size-4);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--ds-size-2);
  }
</style>
