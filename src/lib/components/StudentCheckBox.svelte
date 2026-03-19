<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
    import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants";
    import { studentCheckBoxValueValidation } from "$lib/data-validation/student-check-box-validation";
    import type { NoSlashString } from "$lib/types/api/api-route-map";
  import type { StudentCheckBox, StudentCheckBoxInput } from "$lib/types/db/shared-types"
  import AsyncButton from "./AsyncButton.svelte"

  type StudentCheckBoxProps = {
    checkBox: StudentCheckBox
    editMode: boolean
    callBackOnCreate?: () => void
    callBackOnCancel?: () => void
  }

  let { checkBox, editMode, callBackOnCreate, callBackOnCancel }: StudentCheckBoxProps = $props()

  // svelte-ignore state_referenced_locally - we want a local copy
  let editableCheckBox: StudentCheckBoxInput = $state({
    enabled: checkBox.enabled,
    type: checkBox.type,
    value: checkBox.value,
    sort: checkBox.sort
  } as StudentCheckBoxInput)

  let studentCheckBoxForm: HTMLFormElement | undefined = $state()

  const createStudentCheckBox = async (): Promise<void> => {
    if (!studentCheckBoxForm) {
      throw new Error("Student checkbox form not found")
    }
    const formIsValid = studentCheckBoxForm.reportValidity()
    if (!formIsValid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    await apiFetch("/api/studentcheckboxes", {
      method: "POST",
      body: editableCheckBox,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const deleteStudentCheckBox = async (): Promise<void> => {
    if (!checkBox._id) {
      throw new Error("Mangler id for å kunne slette")
    }
    const confirmation = confirm("Er du sikker på at du vil slette denne sjekkboksen? Den vil bli fjernet fra alle elever, og må legges til på nytt på hver elev dersom den skal legges til på nytt.")
    if (!confirmation) {
      return
    }

    await apiFetch(`/api/studentcheckboxes/${(checkBox._id as NoSlashString)}`, {
      method: "DELETE"
    })
  }

  const updateStudentCheckBox = async (): Promise<void> => {
    if (!checkBox._id) {
      throw new Error("Mangler id for å kunne oppdatere")
    }
    if (!studentCheckBoxForm) {
      throw new Error("Student checkbox form not found")
    }
    const formIsValid = studentCheckBoxForm.reportValidity()
    if (!formIsValid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    await apiFetch(`/api/studentcheckboxes/${(checkBox._id as NoSlashString)}`, {
      method: "PATCH",
      body: editableCheckBox,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const callBackAfterReloadPageData = (): void => {
    if (callBackOnCreate) {
      callBackOnCreate()
    }
    editMode = false
  }
</script>

<div class="student-check-box">
  {#if editMode}
    <form bind:this={studentCheckBoxForm}>
      <input type="text" bind:value={editableCheckBox.value} required minlength={studentCheckBoxValueValidation.minLength} maxlength={studentCheckBoxValueValidation.maxLength} />
      <label>
        <input type="checkbox" bind:checked={editableCheckBox.enabled} />
        Aktiv
      </label>
      <label>
        Sortering
        <input type="number" bind:value={editableCheckBox.sort} required />
      </label>
    </form>
    {#if !checkBox._id}
      <AsyncButton onClick={createStudentCheckBox} buttonText="Opprett" iconName="add" classList={["filled"]} reloadPageDataOnSuccess={true} {callBackAfterReloadPageData} />
    {:else}
      <AsyncButton onClick={updateStudentCheckBox} buttonText="Lagre endringer" iconName="save" classList={["filled"]} reloadPageDataOnSuccess={true} {callBackAfterReloadPageData} />
    {/if}
    <button onclick={() => { editMode = false; if (callBackOnCancel) callBackOnCancel(); }}>Avbryt</button>
  {:else}
    <p><strong>{checkBox.value}</strong>{!checkBox.enabled ? " - Deaktivert (skjult)" : ""}</p>
    <button onclick={() => editMode = true}><span class="material-symbols-outlined">edit</span>Rediger</button>
    <AsyncButton onClick={deleteStudentCheckBox} buttonText="Slett" iconName="delete" classList={["filled", "danger"]} reloadPageDataOnSuccess={true} {callBackAfterReloadPageData} />
  {/if}
</div>


<style>

.student-check-box {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>