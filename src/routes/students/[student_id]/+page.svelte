<script lang="ts">
  import { slide } from "svelte/transition"
  import { afterNavigate } from "$app/navigation"
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import DocumentComponent from "$lib/components/Document/Document.svelte"
  import NewDocument from "$lib/components/Document/NewDocument.svelte"
  import PrincipalAccessTags from "$lib/components/PrincipalAccessTags.svelte"
  import DataSharingConsent from "$lib/components/StudentBoxes/DataSharingConsent.svelte"
  import ImportantStuff from "$lib/components/StudentBoxes/ImportantStuff.svelte"
  import { canEditStudentDataSharingConsent, canEditStudentDocument, canEditStudentImportantStuff } from "$lib/shared-authorization/authorization"
  import type { EnrollmentDetails, PeriodDetails, TemplateInfo } from "$lib/types/app-types"
  import type { AuditEntryInput, Period, SchoolInfo, StudentDocument } from "$lib/types/db/shared-types"
  import { prettifyDate } from "$lib/utils/dates"
  import { getEnrollmentDetails, getFrontendStudentMainDetails } from "$lib/utils/frontend-student-details"
  import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  afterNavigate(({ from, to }) => {
    // Same-page navigation (form action redirecting back to the same URL): skip
    if (from !== null && from.url.pathname === to?.url.pathname) {
      return
    }

    // When from === null the browser did a full page load (fresh visit or F5/⌘R reload).
    // performance.getEntriesByType("navigation")[0].type is set by the browser for this specific
    // page load and reliably returns "reload" on F5/⌘R
    if (from === null && (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type === "reload") {
      return
    }

    const auditEntry: AuditEntryInput = {
      created: {
        by: {
          entraUserId: data.authenticatedPrincipal.id,
          fallbackName: data.authenticatedPrincipal.displayName
        },
        at: new Date()
      },
      action: "OPEN",
      resource: "Student",
      resourceId: data.student._id,
      resourceName: data.student.name
    }

    // we don't need to await this since we don't need to know if it goes through or not
    apiFetch("/api/audit/insert", {
      method: "POST",
      body: {
        auditEntry,
        errorMessage: "opening StudentId {StudentId}",
        errorMessageObject: data.student._id
      },
      headers: {
        "Content-Type": "application/json"
      }
    })
  })

  let referencedDocumentId: string | null = $derived.by(() => page.url.searchParams.get("documentId"))

  let expandedStudentDetails = $state(false)

  let studentMainDetails = $derived.by(() => {
    return getFrontendStudentMainDetails(data.student.enrollmentsWithinViewAccessWindow)
  })

  let studentEnrollmentDetails: EnrollmentDetails[] = $derived.by(() => {
    return data.student.enrollmentsWithinViewAccessWindow.map(getEnrollmentDetails)
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
  <div>
    <h1 class="ds-heading" data-size="lg" style="margin-bottom: 0;">{data.student.name}</h1>
    <span class="ds-paragraph" data-size="sm">{studentEnrollmentDetails.length > 1 ? "Hovedskole: " : ""}{studentMainDetails.mainSchool?.name ?? "Ingen hovedskole"} - {studentMainDetails.mainClass?.name || "Ingen aktiv klasse ved hovedskole"}</span>
    {#if data.student.hasBlockedAddress}
      <div class="ds-alert address-block-container" data-color="warning">
        NB: Adressesperre
      </div>
    {/if}
  </div>
  
  <div class="ds-card student-summary" data-variant="tinted" data-color="brand2">
    <div class="summary-card-header ds-card__block">
      <div class="card-title">
        <span class="material-symbols-outlined">info</span>
        <h2 class="ds-heading" data-size="sm">Elevinformasjon</h2>
      </div>
      <button class="ds-button" data-variant="secondary" type="button" data-size="sm" onclick={() => expandedStudentDetails = !expandedStudentDetails} style="margin-top: 0;">
        <span class="material-symbols-outlined">{expandedStudentDetails ? "expand_circle_up" : "expand_circle_down"}</span>
        {expandedStudentDetails ? "Skjul detaljer" : "Vis alle detaljer"}
      </button>
    </div>
      
    {#if !expandedStudentDetails}
      {#if studentSummaryDetails}
        <div class="ds-card__block student-summary-details">
          {#if studentSummaryDetails.importantInfo}
            <div style="flex: 1.2;">
              <h3 class="ds-heading" data-size="xs">Informasjon</h3>
              <p class="ds-paragraph" style="white-space: pre-wrap;">
                {studentSummaryDetails.importantInfo}
              </p>
            </div>
          {/if}
          {#if studentSummaryDetails.followUp.length > 0 || studentSummaryDetails.facilitation.length > 0}
            <div class="student-summary-checkboxes" style="margin-top: 0;">
              {#if studentSummaryDetails.followUp.length > 0}
                <div>
                  <h3 class="ds-heading" data-size="xs">{STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.single}</h3>
                  <ul class="ds-list">
                    {#each studentSummaryDetails.followUp || [] as followUp}
                      <li>{followUp}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
              {#if studentSummaryDetails.facilitation.length > 0}
                <div>
                  <h3 class="ds-heading" data-size="xs">{STUDENT_CHECKBOX_DISPLAY_NAMES.FACILITATION.plural}</h3>
                  <ul class="ds-list">
                    {#each studentSummaryDetails.facilitation || [] as facilitation}
                      <li>{facilitation}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}

      {#if hasOtherSchoolInfoAndNotConsent}
        <div class="ds-card__block">
          <p class="ds-paragraph">
            Eleven har ikke gitt samtykke til deling av data på tvers av skoler.
            {#if additionalSchools.length > 0}
              Eleven har også elevforhold ved {additionalSchools.map(school => school.name).join(", ")}.
            {/if}
            {#if data.unavailableSchoolDocuments.length > 0}
              Det finnes notater fra andre skoler som ikke er tilgjengelig for deg.
            {/if}
          </p>
        </div>
      {/if}
      <div class="ds-card__block">
        <div class="access-info">
          <p class="ds-paragraph">Din tilgang til eleven</p>
          <PrincipalAccessTags principalAccessForStudent={data.principalAccessForStudent} />
        </div>
      </div>
    {/if}
  </div>

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
            <h2 class="ds-heading">Notattype filter</h2>
            <hr class="ds-divider" />
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
            <hr class="ds-divider" />
            <button class="ds-button" data-variant="tertiary" data-size="sm" type="button" onclick={() => selectedDocumentTypes = []} disabled={selectedDocumentTypes.length === 0}>Fjern alle filter</button>
          </div>
        </div>
        <NewDocument {accessSchools} documentContentTemplates={data.documentContentTemplates} studentId={data.student._id} studentName={data.student.name} studentDataSharingConsent={data.studentDataSharingConsent?.consent} studentAccessPersons={data.studentAccessPersons} />
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
        <DocumentComponent referencedOpen={referencedDocumentId === document._id} {document} {accessSchools} canEditDocument={canEditStudentDocument(data.authenticatedPrincipal, data.principalAccessForStudent, document)} studentName={data.student.name} studentDataSharingConsent={data.studentDataSharingConsent?.consent} studentAccessPersons={data.studentAccessPersons} />
      {/each}
    {/if}
  </div>
{/key}

<style>
  .address-block-container {
      margin-top: var(--ds-size-2)
  }

  .access-info {
    display: flex;
    gap: var(--ds-size-2);
    flex-wrap: wrap;
    align-items: center;
  }

  .student-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .summary-card-header {
    display: flex;
    gap: var(--ds-size-2);
    align-items: center;
    justify-content: space-between;
  }

  .student-summary, .student-details {
    margin: var(--ds-size-4) 0;
  }

  .student-summary-details {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .student-summary-checkboxes {
    margin-top: 0;
    display: flex;
    gap: var(--ds-size-4);
    flex-wrap: wrap;
  }

  .student-summary-checkboxes ul > li {
    margin: 0;
  }

  .consent-and-access-container {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .documents {
    display: flex;
    flex-direction: column;
    border-radius: 4px;
  }

  .documents-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--ds-size-4);
  }
  
  #documents {
    scroll-margin-top: var(--header-height);
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
