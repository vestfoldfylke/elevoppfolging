<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { FrontendStudent } from "$lib/types/app-types"
  import type { SchoolInfo, StudentCheckBox, StudentImportantStuff, StudentImportantStuffInput } from "$lib/types/db/shared-types"
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

  let editableImportantStuff: StudentImportantStuffInput = $state({
    // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounter ved endring av student
    school: school,
    // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounter ved endring av student
    importantInfo: importantStuff?.importantInfo || "",
    // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounter ved endring av student
    facilitation: importantStuff?.facilitation.filter((facilitationId) => studentCheckBoxes.find((checkbox) => checkbox._id === facilitationId && checkbox.enabled)) || [],
    // svelte-ignore state_referenced_locally - det går bra så lenge denne komponenten remounter ved endring av student
    followUp: importantStuff?.followUp.filter((followUpId) => studentCheckBoxes.find((checkbox) => checkbox._id === followUpId && checkbox.enabled)) || []
  } as StudentImportantStuffInput)

  const updateStudentImportantStuff = async (): Promise<void> => {
    if (!importantStuffForm) {
      throw new Error("Important stuff form not found")
    }
    const valid = importantStuffForm.reportValidity()
    if (!valid) {
      throw new Error("Vennligst fyll ut alle påkrevde felt før du lagrer")
    }

    await apiFetch(`/api/students/${student._id}/importantstuff`, {
      method: "PATCH",
      body: editableImportantStuff,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
</script>

<div class="student-section">
  <div class="student-section-header">
    <h3>{school.name}</h3>
    {#if canEdit && !editMode}
      <button onclick={() => editMode = true}>Rediger</button>
    {/if}
  </div>
  <div class="student-section-content">
    {#if editMode}
      <form bind:this={importantStuffForm}>
        <textarea bind:value={editableImportantStuff.importantInfo} placeholder="Skriv viktig informasjon om eleven som er relevant for skolen"></textarea>
        <br />
        <h4>Oppfølging</h4>
        {#each studentCheckBoxes.filter(checkbox => checkbox.enabled && checkbox.type === "FOLLOW_UP") as followUpCheckbox}
          <label>{followUpCheckbox.value}
            <input type="checkbox" id={followUpCheckbox._id} bind:group={editableImportantStuff.followUp} value={followUpCheckbox._id} />
          </label>
        {/each}
        <br />
        <h4>Tilrettelegging</h4>
        {#each studentCheckBoxes.filter(checkbox => checkbox.enabled && checkbox.type === "FACILITATION") as facilitationCheckbox}
          <label>{facilitationCheckbox.value}
            <input type="checkbox" id={facilitationCheckbox._id} bind:group={editableImportantStuff.facilitation} value={facilitationCheckbox._id} />
          </label>
        {/each}
      </form>
      <AsyncButton onClick={() => updateStudentImportantStuff()} reloadPageDataOnSuccess={true} buttonText="Lagre" classList={["filled"]} iconName="save" callBackAfterReloadPageData={() => { editMode = false }} />
      <button type="button" onclick={() => editMode = false}>Avbryt</button>
    {:else}
      <p>Redigert av: {importantStuff?.modified.by.fallbackName}</p>
      <p>Viktig informasjon: {importantStuff?.importantInfo || "Ingen viktig informasjon lagt til"}</p>
      <div>
        <h4>Oppfølging</h4>
        <ul>
          {#each importantStuff?.followUp.filter(followUpId => studentCheckBoxes.find(checkbox => checkbox._id === followUpId && checkbox.enabled)) || [] as followUpId}
            <li>{studentCheckBoxes.find(checkbox => checkbox._id === followUpId)?.value}</li>
          {/each}
        </ul>
      </div>
      <div>
        <h4>Tilrettelegging</h4>
        <ul>
          {#each importantStuff?.facilitation.filter(facilitationId => studentCheckBoxes.find(checkbox => checkbox._id === facilitationId && checkbox.enabled)) || [] as facilitationId}
            <li>{studentCheckBoxes.find(checkbox => checkbox._id === facilitationId)?.value}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<style>

</style>