<script lang="ts">
  import { slide } from "svelte/transition"
  import DocumentComponent from "$lib/components/Document/Document.svelte"
  import NewDocument from "$lib/components/Document/NewDocument.svelte"
  import PrincipalAccessTags from "$lib/components/PrincipalAccessTags.svelte"
  import DataSharingConsent from "$lib/components/StudentBoxes/DataSharingConsent.svelte"
  import ImportantStuff from "$lib/components/StudentBoxes/ImportantStuff.svelte"
  import { canEditStudentDataSharingConsent, canEditStudentImportantStuff } from "$lib/shared-authorization/authorization"
  import type { EnrollmentDetails, PeriodDetails } from "$lib/types/app-types"
  import type { Period, SchoolInfo, StudentDocument } from "$lib/types/db/shared-types"
  import { getEnrollmentDetails, getFrontendStudentMainDetails } from "$lib/utils/frontend-student-details"
  import { prettifyDate } from "$lib/utils/prettify-date"
  import type { PageProps } from "./$types"

  type TemplateInfo = {
    id: string
    name: string
  }

  let { data }: PageProps = $props()

  let expandedStudentDetails = $state(false)

  let studentMainDetails = $derived.by(() => {
    return getFrontendStudentMainDetails(data.student.enrollmentsWithinViewAccessWindow)
  })

  let studentEnrollmentDetails: EnrollmentDetails[] = $derived.by(() => {
    return data.student.enrollmentsWithinViewAccessWindow.map(getEnrollmentDetails)
  })

  let additionalSchool: SchoolInfo[] = $derived.by(() => {
    return data.student.enrollmentsWithinViewAccessWindow.filter((enrollment) => !enrollment.mainSchool).map((enrollment) => enrollment.school)
  })

  type StudentSummaryDetails =
    | {
        importantInfo: string | null
        facilitation: string[]
        followUp: string[]
      }
    | undefined

  let studentSummaryDetails: StudentSummaryDetails = $derived.by(() => {
    const importantStuffToUse = data.importantStuff.find((importantStuff) => importantStuff.school.schoolNumber === studentMainDetails.mainSchool?.schoolNumber) || data.importantStuff[0] || null
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

  let additionalSchools: SchoolInfo[] = $derived.by(() => {
    return data.student.enrollmentsWithinViewAccessWindow.filter((enrollment) => enrollment.school.schoolNumber !== studentMainDetails.mainSchool?.schoolNumber).map((enrollment) => enrollment.school)
  })

  let hasOtherSchoolInfoAndNotConsent = $derived.by(() => {
    return (data.unavailableSchoolDocuments.length > 0 || additionalSchools.length > 0) && !data.studentDataSharingConsent?.consent
  })

  let accessSchools: SchoolInfo[] = $derived.by(() => {
    const uniqueAccessSchools: SchoolInfo[] = []
    for (const access of data.principalAccessForStudent) {
      if (uniqueAccessSchools.some((school) => school.schoolNumber === access.schoolNumber)) {
        continue
      }
      const school = data.schools.find((school) => school.schoolNumber === access.schoolNumber)
      if (!school) {
        throw new Error(`School not found for access with school number ${access.schoolNumber}, something wrong here gitt`)
      }
      uniqueAccessSchools.push(school)
    }

    if (uniqueAccessSchools.length === 0) {
      throw new Error("No access found for student, something wrong here gitt")
    }

    return uniqueAccessSchools
  })

  let documentTypes: TemplateInfo[] = $derived.by(() => {
    const templates: Map<string, string> = new Map()
    data.documents.forEach((document: StudentDocument) => {
      if (templates.has(document.template._id)) {
        return
      }

      templates.set(document.template._id, document.template.name)
    })

    return Array.from(templates)
      .map((template: [string, string]) => ({ id: template[0], name: template[1] }))
      .sort((a: TemplateInfo, b: TemplateInfo) => a.name.localeCompare(b.name))
  })

  let selectedDocumentTypes: string[] = $state([])

  let filteredDocuments: StudentDocument[] = $derived.by(() => {
    if (selectedDocumentTypes.length === 0) {
      return data.documents
    }

    return data.documents.filter((document: StudentDocument) => selectedDocumentTypes.includes(document.template._id))
  })

  const removeDocumentsFilter = (templateId: string): void => {
    if (!selectedDocumentTypes.includes(templateId)) {
      throw new Error("Trying to remove document filter that is not selected, something wrong here gitt")
    }

    selectedDocumentTypes = selectedDocumentTypes.filter((id: string) => id !== templateId)
  }

  const getDocumentTypeInfo = (templateId: string): TemplateInfo => {
    const documentType: TemplateInfo | undefined = documentTypes.find((documentType) => documentType.id === templateId)
    if (!documentType) {
      throw new Error(`No document type found for ${templateId}`)
    }

    return documentType
  }
</script>

{#key data.student._id} <!-- Re-render entire student page when student-id change -->
  <h1 class="ds-heading student-name" data-size="lg">{data.student.name}</h1>
  <span class="ds-paragraph" data-size="sm">{studentMainDetails.mainSchool?.name ?? "Ingen hovedskole"} - {studentMainDetails.mainClass?.name || "Ingen aktiv klasse ved hovedskole"}</span>

  <p class="ds-paragraph" data-size="sm" style="margin-top: var(--ds-size-2);">Din tilgang til eleven</p>
  <div class="access-info">
    <PrincipalAccessTags principalAccessForStudent={data.principalAccessForStudent} />
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
            {#if additionalSchool.length > 0}
              Eleven har også elevforhold ved {additionalSchool.map(school => school.name).join(", ")}.
            {/if}
            {#if data.unavailableSchoolDocuments.length > 0}
              Det finnes notater fra andre skoler som ikke er tilgjengelig for deg.
            {/if}
          </p>
        </div>
      {/if}
    </div>
  {/if}

  {#snippet periodDetails(period: Period & PeriodDetails)}
    <p class="ds-paragraph" data-size="sm">
      Periode: { period.start ? prettifyDate(period.start) : "Ukjent"} - {period.end ? prettifyDate(period.end) : "Ingen sluttdato"}
      {#if !period.active}
        {#if period.withinViewAccessWindow}
          {#if period.daysUntilActive && period.daysUntilActive > 0}
            (Starter om {period.daysUntilActive} dager)
          {/if}
          {#if period.daysAfterExpired && period.daysAfterExpired > 0}
            (Inaktiv i {period.daysAfterExpired} dager)
          {/if}
        {/if}
      {/if}
    </p>
  {/snippet}
  
  {#if expandedStudentDetails}
    <div class="student-details" transition:slide>
      {#each accessSchools as accessSchool}
        <ImportantStuff canEdit={canEditStudentImportantStuff(accessSchool.schoolNumber, data.principalAccessForStudent)} importantStuff={data.importantStuff.find(importantStuff => importantStuff.school.schoolNumber === accessSchool.schoolNumber) || null} school={accessSchool} studentCheckBoxes={data.studentCheckBoxes} student={data.student} />
      {/each}

      <div class="consent-and-access-container">
        <DataSharingConsent canEdit={canEditStudentDataSharingConsent(data.principalAccessForStudent)} student={data.student} studentDataSharingConsent={data.studentDataSharingConsent} unavailableSchoolDocuments={data.unavailableSchoolDocuments} />
        
        <div class="ds-card" data-variant="tinted" data-color="brand2">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined">school</span>
              <h2 class="ds-heading" data-size="sm">Personer med tilgang til eleven</h2>
            </div>
          </div>
          <div>
            <ul class="ds-list">
              {#each data.studentAccessPersons as studentAccessPerson}
                <li>
                  {studentAccessPerson.entra.displayName}
                  <PrincipalAccessTags principalAccessForStudent={studentAccessPerson.principalAccessForStudent} />
                </li>
              {/each}
            </ul>
          </div>
        </div>
      </div>

      {#each studentEnrollmentDetails as enrollment}
        <div class="ds-card" data-variant="tinted" data-color="brand3">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined">info</span>
              <h2 class="ds-heading" data-size="sm">Elevforhold ved {enrollment.school.name}</h2>
            </div>
          </div>
          <div>
            {@render periodDetails(enrollment.period)}
            <p class="ds-paragraph" data-size="sm">Klasser</p>
            <ul class="ds-list">
              {#if enrollment.classGroups.length === 0}
                <li>Ingen klasser</li>
              {/if}
              {#each enrollment.classGroups as classGroup}
                <li>{classGroup.name}</li>
              {/each}
            </ul>
            <p class="ds-paragraph" data-size="sm">Kontaktlærere</p>
            <ul class="ds-list">
              {#if !enrollment.contactTeacherGroup || enrollment.contactTeacherGroup?.teachers.length === 0}
                <li>Ingen kontaktlærere</li>
              {/if}
              {#each enrollment.contactTeacherGroup?.teachers || [] as contactTeacher}
                <li>{contactTeacher.name}</li>
              {/each}
            </ul>
            <p class="ds-paragraph" data-size="sm">Undervisningsgrupper</p>
            <ul class="ds-list">
              {#if enrollment.teachingGroups.length === 0}
                <li>Ingen undervisningsgrupper</li>
              {/if}
              {#each enrollment.teachingGroups as teachingGroup}
                <li>{teachingGroup.name}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/each}
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
      <h2 id="documents" class="ds-heading">Notater</h2>
      <div class="documents-header-actions">
        <div class="documents-filter-action">
          <button
            disabled={documentTypes.length === 0}
            class="ds-button"
            data-variant="secondary"
            type="button"
            popovertarget="documents-filter-action-container"
            aria-label="Notattype filter"
            data-tooltip="Notattype filter"
            data-placement="top"
            data-autoplacement="true"
          >
            <span class="material-symbols-outlined">filter_list</span>
          </button>
          <div id="documents-filter-action-container" class="ds-popover ds-dropdown" popover="auto" data-placement="bottom-end" data-variant="default">
            <ul class="ds-list">
              {#each documentTypes as documentType}
                <li>
                  <ds-field class="ds-field">
                    <input id="documents-filter-{documentType.id}" bind:group={selectedDocumentTypes} class="ds-input" type="checkbox" value={documentType.id} />
                    <label for="documents-filter-{documentType.id}" class="ds-label" data-weight="regular">{documentType.name}</label>
                  </ds-field>
                </li>
              {/each}
            </ul>
          </div>
        </div>
        <NewDocument {accessSchools} documentContentTemplates={data.documentContentTemplates} studentId={data.student._id} studentDataSharingConsent={data.studentDataSharingConsent?.consent} studentAccessPersons={data.studentAccessPersons} />
      </div>
    </div>

    {#if data.documents.length === 0}
      <p>Ingen notater her</p>
    {:else}
      <div class="documents-filter">
        {#each selectedDocumentTypes.map(getDocumentTypeInfo) as selectedDocumentType}
          <button class="ds-chip" id={selectedDocumentType.id} aria-label={`Fjern ${selectedDocumentType.name}`} onclick={() => removeDocumentsFilter(selectedDocumentType.id)} data-removable="true">{selectedDocumentType.name}</button>
        {/each}
      </div>
      {#each filteredDocuments as document (document._id)}
        <DocumentComponent {document} principalAccessForStudent={data.principalAccessForStudent} studentName={data.student.name} />
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

  .documents-header {
    margin-bottom: var(--ds-size-4);
  }
  
  .documents-header-actions {
      display: flex;
      gap: var(--ds-size-2);
  }

  .documents-filter {
      margin-bottom: var(--ds-size-4);
      display: flex;
      gap: var(--ds-size-1) var(--ds-size-2);
      flex-wrap: wrap;
  }
</style>
