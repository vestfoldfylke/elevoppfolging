<script lang="ts">
  import { tick } from "svelte"
  import { slide } from "svelte/transition"
  import DocumentComponent from "$lib/components/Document/Document.svelte"
  import NewDocument from "$lib/components/Document/NewDocument.svelte"
  import DataSharingConsent from "$lib/components/StudentBoxes/DataSharingConsent.svelte"
  import ImportantStuff from "$lib/components/StudentBoxes/ImportantStuff.svelte"
  import { canEditStudentDataSharingConsent, canEditStudentImportantStuff } from "$lib/shared-authorization/authorization"
  import type { SchoolInfo, Source } from "$lib/types/db/shared-types"
  import { ACCESS_TYPE_DISPLAY_NAMES } from "$lib/utils/access-constants"
  import { getFrontendStudentDetails } from "$lib/utils/frontend-student-details"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let expandedStudentDetails = $state(false)
  let documentCreatorOpen = $state(false)

  const openDocumentCreator = async () => {
    documentCreatorOpen = true
    await tick()
    const documentsHeader = document.getElementById("documents")
    if (documentsHeader) {
      documentsHeader.scrollIntoView({ behavior: "smooth" })
    }
  }

  let studentDetails = $derived.by(() => {
    return getFrontendStudentDetails(data.student, data.APP_INFO)
  })

  type AccessInfo = {
    accessDisplayName: string
    school: SchoolInfo
    source: Source
  }

  let accessInfo: AccessInfo[] = $derived.by(() => {
    return data.principalAccessToStudent.map((access) => {
      const school = data.student.studentEnrollments.find((enrollment) => enrollment.school.schoolNumber === access.schoolNumber)?.school
      if (!school) {
        throw new Error(`School not found for access with school number ${access.schoolNumber}, something wrong here gitt`)
      }
      return { accessDisplayName: ACCESS_TYPE_DISPLAY_NAMES[access.type], school, source: access.source }
    })
  })

  type StudentSummaryDetails =
    | {
        importantInfo: string | null
        facilitation: string[]
        followUp: string[]
      }
    | undefined

  let studentSummaryDetails: StudentSummaryDetails = $derived.by(() => {
    const importantStuffToUse = data.importantStuff.find((importantStuff) => importantStuff.school.schoolNumber === studentDetails.mainSchool?.schoolNumber) || data.importantStuff[0] || null
    if (!importantStuffToUse) {
      return undefined
    }
    const importantInfo = importantStuffToUse.importantInfo || null
    const followUp: string[] = []
    const facilitation: string[] = []
    importantStuffToUse.followUp.forEach((followUpId) => {
      const followUpCheckBox = data.studentCheckBoxes.find((checkbox) => checkbox._id === followUpId)
      if (followUpCheckBox) {
        followUp.push(followUpCheckBox.value)
      }
    })
    importantStuffToUse.facilitation.forEach((facilitationId) => {
      const facilitationCheckBox = data.studentCheckBoxes.find((checkbox) => checkbox._id === facilitationId)
      if (facilitationCheckBox) {
        facilitation.push(facilitationCheckBox.value)
      }
    })

    if (!importantInfo && followUp.length === 0 && facilitation.length === 0) {
      return undefined
    }

    return { importantInfo, facilitation, followUp }
  })

  let hasOtherSchoolInfoAndNotConsent = $derived.by(() => {
    return (data.unavailableSchoolDocuments.length > 0 || studentDetails.additionalSchools.length > 0) && !data.studentDataSharingConsent?.consent
  })

  let accessSchools: SchoolInfo[] = $derived.by(() => {
    const accessSchools = data.principalAccessToStudent.map((access) => {
      const school = data.student.studentEnrollments.find((enrollment) => enrollment.school.schoolNumber === access.schoolNumber)?.school
      if (!school) {
        throw new Error(`School not found for access with school number ${access.schoolNumber}, something wrong here gitt`)
      }
      return school
    })

    if (accessSchools.length === 0) {
      throw new Error("No access found for student, something wrong here gitt")
    }

    return accessSchools
  })
</script>

{#key data.student._id} <!-- Re-render entire student page when student-id change -->
  <h1 class="ds-heading student-name" data-size="lg">{data.student.name}</h1>
  <span class="ds-paragraph" data-size="sm">{studentDetails.mainSchool?.name ?? "Ingen hovedskole"} - {studentDetails.mainClassMembership?.classGroup.name || "Ingen aktiv klasse ved hovedskole"}</span>

  <p class="ds-paragraph" data-size="sm" style="margin-top: var(--ds-size-2);">Din tilgang til eleven</p>
  <div class="access-info">
    {#each accessInfo as access}
      <span
        class="ds-tag"
        data-variant="default"
        data-color={access.source === "AUTO" ? "accent" : "brand1"}
        data-size="md"
        style="padding-inline-start:var(--ds-size-1)"
      >
        {access.accessDisplayName} ved {access.school.name}
      </span>
    {/each}
  </div>
  
  {#if !expandedStudentDetails && (studentSummaryDetails || hasOtherSchoolInfoAndNotConsent)}
    <div class="student-summary">
      {#if studentSummaryDetails}
        {#if studentSummaryDetails.importantInfo}
          <div>
            <p class="ds-paragraph">
              <strong>Viktig informasjon</strong>
              <br />
              {studentSummaryDetails.importantInfo}
            </p>
          </div>
        {/if}
        {#if studentSummaryDetails.followUp.length > 0}
          <div>
            <p class="ds-paragraph">
              <strong>Oppfølging</strong>
              <br />
              {studentSummaryDetails.followUp.join(", ")}              
            </p>
          </div>
        {/if}
        {#if studentSummaryDetails.facilitation.length > 0}
          <div>
            <p class="ds-paragraph">
              <strong>Tilrettelegging</strong>
              <br />
              {studentSummaryDetails.facilitation.join(", ")}
            </p>
          </div>
        {/if}
      {/if}
      {#if hasOtherSchoolInfoAndNotConsent}
        <div>
          <p class="ds-paragraph">
            Eleven har ikke gitt samtykke til deling av data på tvers av skoler. 
            {#if studentDetails.additionalSchools.length > 0}
              Eleven har også elevforhold ved {studentDetails.additionalSchools.map(school => school.name).join(", ")}.
            {/if}
            {#if data.unavailableSchoolDocuments.length > 0}
              Det finnes notater fra andre skoler som ikke er tilgjengelig for deg.
            {/if}
          </p>
        </div>
      {/if}
    </div>
  {/if}
  
  {#if expandedStudentDetails}
    <div class="student-details" transition:slide>
      {#each accessSchools as accessSchool}
        <ImportantStuff canEdit={canEditStudentImportantStuff(accessSchool.schoolNumber, data.principalAccessToStudent)} importantStuff={data.importantStuff.find(importantStuff => importantStuff.school.schoolNumber === accessSchool.schoolNumber) || null} school={accessSchool} studentCheckBoxes={data.studentCheckBoxes} student={data.student} />
      {/each}

      <div class="consent-and-access-container">
        <DataSharingConsent canEdit={canEditStudentDataSharingConsent(data.principalAccessToStudent)} student={data.student} studentDataSharingConsent={data.studentDataSharingConsent} unavailableSchoolDocuments={data.unavailableSchoolDocuments} />
        
        <div class="ds-card" data-variant="tinted" data-color="brand2">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined">school</span>
              <h2 class="ds-heading" data-size="sm">Personer med tilgang til eleven</h2>
            </div>
          </div>
          <div>
            Kommer etterhvert
          </div>
        </div>
      </div>
    </div>
  {/if}

  <div class="show-details-container">
    <button class="ds-button" data-variant="secondary" type="button" data-size="sm" onclick={() => expandedStudentDetails = !expandedStudentDetails}>
      <span class="material-symbols-outlined">{expandedStudentDetails ? "expand_circle_up" : "expand_circle_down"}</span>
      {expandedStudentDetails ? "Skjul detaljer" : "Vis detaljer"}
    </button>
  </div>

  <hr aria-hidden="true" class="ds-divider"/>

  <div class="documents">
    <div class="documents-header">
      {#if !documentCreatorOpen}
        <h2 id="documents" class="ds-heading">Notater</h2>
        <button class="ds-button" onclick={openDocumentCreator}><span class="material-symbols-outlined">note_add</span>Nytt notat</button>
      {:else}
        <h2 id="documents" class="ds-heading">Nytt notat</h2>
      {/if}
    </div>

    <div class="new-document">
      {#if documentCreatorOpen}
        <NewDocument {accessSchools} documentContentTemplates={data.documentContentTemplates} bind:creatorOpen={documentCreatorOpen} studentId={data.student._id} />
      {/if}
    </div>

    {#if data.documents.length === 0}
      <p>Ingen notater her</p>
    {:else}
      {#each data.documents as document (document._id)}
        <DocumentComponent {document} {accessSchools} />
      {/each}
    {/if}

  </div>
{/key}


<style>
  h1.student-name {
    margin-bottom: 0;
  }

  .access-info {
    display: flex;
    gap: var(--ds-size-2);
    flex-wrap: wrap;
  }

  .student-summary > div, .show-details-container, .student-details {
    margin: var(--ds-size-4) 0;
  }

  .student-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .consent-and-access-container {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  #documents {
    scroll-margin-top: var(--header-height);
  }

  .documents-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .documents {
    display: flex;
    flex-direction: column;
    border-radius: 4px;
  }

  .new-document {
    margin-bottom: var(--ds-size-4);
  }
</style>
