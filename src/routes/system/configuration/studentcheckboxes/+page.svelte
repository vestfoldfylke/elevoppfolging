<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte"
  import StudentCheckBoxComponent from "$lib/components/StudentCheckBox.svelte"
  import type { EditorData, StudentCheckBox } from "$lib/types/db/shared-types"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let addStudentFollowUpCheckBoxOpen = $state(false)
  let addStudentFacilitationCheckBoxOpen = $state(false)

  const mockEditor: EditorData = {
    at: new Date(),
    by: {
      entraUserId: "mockUserId",
      fallbackName: "Mock User"
    }
  }

  const newStudentFollowUpCheckBox: StudentCheckBox = {
    _id: "",
    type: "FOLLOW_UP",
    value: "",
    enabled: true,
    created: mockEditor,
    modified: mockEditor,
    sort: 10
  }

  const newStudentFacilitationCheckBox: StudentCheckBox = {
    ...newStudentFollowUpCheckBox,
    type: "FACILITATION"
  }
</script>

<div class="page-content">
  <PageHeader title="Konfigurasjon av oppfølging/tilrettelegging-sjekkbokser (K.A.O.S)" />
  <p>De som er i viktig informasjonsboksen på elevsiden</p>
  <h3>Oppfølging</h3>
  {#if data.checkBoxes.filter(checkBox => checkBox.type === "FOLLOW_UP").length === 0}
    <p>Ingen oppfølgings-sjekkbokser er lagt til enda</p>
  {/if}
  {#each data.checkBoxes.filter(checkBox => checkBox.type === "FOLLOW_UP") as checkBox (checkBox._id)}
    <StudentCheckBoxComponent {checkBox} editMode={false} />
  {/each}
  <div class="add-student-checkbox">
    {#if !addStudentFollowUpCheckBoxOpen}
      <button onclick={() => addStudentFollowUpCheckBoxOpen = true}>Legg til ny oppfølgings-sjekkboks</button>
    {/if}
    {#if addStudentFollowUpCheckBoxOpen}
      <StudentCheckBoxComponent checkBox={newStudentFollowUpCheckBox} editMode={true} callBackOnCancel={() => addStudentFollowUpCheckBoxOpen = false} callBackOnCreate={() => addStudentFollowUpCheckBoxOpen = false} />
    {/if}
  </div>


  <h3>Tilrettelegging</h3>
  {#if data.checkBoxes.filter(checkBox => checkBox.type === "FACILITATION").length === 0}
    <p>Ingen tilretteleggings-sjekkbokser er lagt til enda</p>
  {/if}
  {#each data.checkBoxes.filter(checkBox => checkBox.type === "FACILITATION") as checkBox (checkBox._id)}
    <StudentCheckBoxComponent {checkBox} editMode={false} />
  {/each}
  <div class="add-student-checkbox">
    {#if !addStudentFacilitationCheckBoxOpen}
      <button onclick={() => addStudentFacilitationCheckBoxOpen = true}>Legg til ny tilretteleggings-sjekkboks</button>
    {/if}
    {#if addStudentFacilitationCheckBoxOpen}
      <StudentCheckBoxComponent checkBox={newStudentFacilitationCheckBox} editMode={true} callBackOnCancel={() => addStudentFacilitationCheckBoxOpen = false} callBackOnCreate={() => addStudentFacilitationCheckBoxOpen = false} />
    {/if}
  </div>
</div>


<style>
</style>
