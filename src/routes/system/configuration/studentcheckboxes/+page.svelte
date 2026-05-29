<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte"
  import StudentCheckBoxComponent from "$lib/components/StudentCheckBox.svelte"
  import type { EditorData, StudentCheckBox } from "$lib/types/db/shared-types"
  import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let addStudentFollowUpCheckBoxOpen = $state(false)
  let addStudentFacilitationCheckBoxOpen = $state(false)

  let followUpCheckBoxes: StudentCheckBox[] = $derived.by(() => {
    return data.checkBoxes.filter((checkBox: StudentCheckBox) => checkBox.type === "FOLLOW_UP")
  })

  let facilitationCheckBoxes: StudentCheckBox[] = $derived.by(() => {
    return data.checkBoxes.filter((checkBox: StudentCheckBox) => checkBox.type === "FACILITATION")
  })

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

  const followUpDisplayName: string = STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.single || STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.plural
  const followUpDisplayNameLowerCase: string = followUpDisplayName.toLowerCase()
  const facilitationDisplayName: string = STUDENT_CHECKBOX_DISPLAY_NAMES.FACILITATION.plural
  const facilitationDisplayNameLowerCase: string = facilitationDisplayName.toLowerCase()
</script>

<div class="page-content">
  <PageHeader title={`Konfigurasjon av ${followUpDisplayNameLowerCase}/${facilitationDisplayNameLowerCase}-sjekkbokser (K.A.O.S)`} />

  <div class="ds-alert content-item" data-color="info">De som er i viktig informasjonsboksen på elevsiden</div>

  <ds-tabs class="ds-tabs">
    <ds-tablist>
      <ds-tab>
        {followUpDisplayName}
      </ds-tab>
      <ds-tab>
        {facilitationDisplayName}
      </ds-tab>
    </ds-tablist>

    <ds-tabpanel>
      <div class="student-check-boxes-content">
        <div class="add-student-checkbox">
          {#if !addStudentFollowUpCheckBoxOpen}
            <div class="add-student-checkbox-action">
              <button class="ds-button" onclick={() => addStudentFollowUpCheckBoxOpen = true}>
                <span class="material-symbols-outlined">add</span>Legg til ny {followUpDisplayNameLowerCase}-sjekkboks
              </button>
            </div>
          {:else}
            <StudentCheckBoxComponent checkBox={newStudentFollowUpCheckBox} editMode={true} name="Legg til ny {followUpDisplayNameLowerCase}-sjekkboks" callBackOnCancel={() => addStudentFollowUpCheckBoxOpen = false} callBackOnCreate={() => addStudentFollowUpCheckBoxOpen = false} />
          {/if}
        </div>
      
        {#if followUpCheckBoxes.length === 0}
          <p>Ingen {followUpDisplayNameLowerCase}-sjekkbokser er lagt til enda</p>
        {:else}
          <table class="ds-table">
            <thead>
              <tr>
                <th aria-sort="none">Navn</th>
                <th aria-sort="none">Sortering</th>
                <th aria-sort="none">Aktiv</th>
                <th aria-sort="none">Opprettet</th>
                <th aria-sort="none">Endret</th>
                <th aria-sort="none"></th>
              </tr>
            </thead>
            <tbody>
              {#each followUpCheckBoxes as followUpCheckBox (followUpCheckBox._id)}
                <tr>
                  <StudentCheckBoxComponent checkBox={followUpCheckBox} editMode={false} />
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </ds-tabpanel>

    <ds-tabpanel>
      <div class="student-check-boxes-content">
        <div class="add-student-checkbox">
          {#if !addStudentFacilitationCheckBoxOpen}
            <div class="add-student-checkbox-action">
              <button class="ds-button" onclick={() => addStudentFacilitationCheckBoxOpen = true}>
                <span class="material-symbols-outlined">add</span>Legg til ny {facilitationDisplayNameLowerCase}-sjekkboks
              </button>
            </div>
          {:else}
            <StudentCheckBoxComponent checkBox={newStudentFacilitationCheckBox} editMode={true} name="Legg til ny {facilitationDisplayNameLowerCase}-sjekkboks" callBackOnCancel={() => addStudentFacilitationCheckBoxOpen = false} callBackOnCreate={() => addStudentFacilitationCheckBoxOpen = false} />
          {/if}
        </div>

        {#if facilitationCheckBoxes.length === 0}
          <p>Ingen {facilitationDisplayNameLowerCase}-sjekkbokser er lagt til enda</p>
        {:else}
          <table class="ds-table">
            <thead>
            <tr>
              <th aria-sort="none">Navn</th>
              <th aria-sort="none">Sortering</th>
              <th aria-sort="none">Aktiv</th>
              <th aria-sort="none">Opprettet</th>
              <th aria-sort="none">Endret</th>
              <th aria-sort="none"></th>
            </tr>
            </thead>
            <tbody>
            {#each facilitationCheckBoxes as facilitationCheckBox (facilitationCheckBox._id)}
              <tr>
                <StudentCheckBoxComponent checkBox={facilitationCheckBox} editMode={false} />
              </tr>
            {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </ds-tabpanel>
  </ds-tabs>
</div>

<style>
  .add-student-checkbox {
    margin: var(--ds-size-4) 0 var(--ds-size-4) 0;
  }

  .add-student-checkbox-action {
    display: flex;
    justify-content: flex-end;
  }
</style>
