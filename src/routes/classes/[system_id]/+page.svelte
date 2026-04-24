<script lang="ts">
  import { slide } from "svelte/transition"
  import { page } from "$app/state"
  import ImportantGroupStuff from "$lib/components/ImportantGroupStuff.svelte"
  import PrincipalAccessTag from "$lib/components/PrincipalAccessTag.svelte"
  import type {EnrollmentWithinViewAccessWindow, FrontendOverviewStudent, PrincipalAccess, ProgramAreaPrincipalAccess, TemplateInfo} from "$lib/types/app-types"
  import type {
    ClassAutoAccessEntry,
    ClassManualAccessEntry,
    GroupImportantStuff,
    SchoolLeaderManualAccessEntry,
    StudentClassGroup,
    StudentDocument
  } from "$lib/types/db/shared-types"
  import { ACCESS_TYPE_DISPLAY_NAMES } from "$lib/utils/access-constants"
  import type { PageProps } from "./$types"
  import DocumentComponent from "$lib/components/Document/Document.svelte";
  import NewDocument from "$lib/components/Document/NewDocument.svelte";

  type ClassSummaryDetails = { groupImportantInfo: GroupImportantStuff | null } | undefined

  type ClassAccess = {
    classEntries: (ClassAutoAccessEntry | ClassManualAccessEntry)[]
    programAreas: ProgramAreaPrincipalAccess[]
    schools: SchoolLeaderManualAccessEntry[]
  }

  let { data }: PageProps = $props()

  let sortBy = $state<"name">("name")
  let sortDirection = $state<"ascending" | "descending">("ascending")

  let principalAccess: PrincipalAccess = $derived.by(() => {
    if (!data.principalAccess) {
      throw new Error("No access found for principal")
    }

    if (data.principalAccess.programAreas.length === 0 && data.principalAccess.classes.length === 0) {
      throw new Error("No program areas or classes found on this principal access")
    }

    return data.principalAccess
  })

  let classAccess: ClassAccess = $derived.by(() => {
    const programAreas = principalAccess.programAreas.filter((programArea) => programArea.classSystemIds.includes(selectedClass.systemId))
    const classEntries = principalAccess.classes.filter((classEntry) => classEntry.systemId === selectedClass.systemId)
    const schools = principalAccess.leaderForSchools.filter((leaderForSchool) => leaderForSchool.schoolNumber === selectedClass.school.schoolNumber)

    if (programAreas.length === 0 && classEntries.length === 0 && schools.length === 0) {
      throw new Error("No access to this class found for principal")
    }

    return {
      classEntries,
      programAreas,
      schools
    }
  })

  let selectedClass: StudentClassGroup = $derived.by(() => {
    const classId: string | undefined = page.params.system_id
    if (!classId) {
      throw new Error("Klasse ID mangler")
    }

    const selectedClassEntry: StudentClassGroup | undefined = data.classes.find((classEntry: StudentClassGroup) => classEntry.systemId === classId)
    if (!selectedClassEntry) {
      throw new Error("Klasse ID ikke funnet")
    }

    return selectedClassEntry
  })

  let classStudents: FrontendOverviewStudent[] = $derived.by(() =>
    data.students.filter((student: FrontendOverviewStudent) =>
      student.enrollmentsWithinViewAccessWindow.some((enrollment: EnrollmentWithinViewAccessWindow) =>
        enrollment.classMemberships.some((classMembership) => classMembership.classGroup.systemId === selectedClass.systemId)
      )
    )
  )

  let filteredStudents = $derived.by(() => {
    return classStudents.sort((a: FrontendOverviewStudent, b: FrontendOverviewStudent) => {
      switch (sortBy) {
        case "name":
          return sortDirection === "ascending" ? (a.name || "").localeCompare(b.name || "") : (b.name || "").localeCompare(a.name || "")
        default:
          return 0
      }
    })
  })

  let classSummaryDetails: ClassSummaryDetails = $derived.by(() => {
    const groupImportantStuffToUse: GroupImportantStuff | null =
      data.groupImportantStuff.find((importantStuff) => importantStuff.school.schoolNumber === selectedClass.school.schoolNumber) || data.groupImportantStuff[0] || null
    if (!groupImportantStuffToUse) {
      return undefined
    }

    const groupImportantInfo = groupImportantStuffToUse || null
    if (!groupImportantInfo) {
      return undefined
    }

    return { groupImportantInfo }
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

<div class="page-content">
  <div class="page-header">
    <h1 class="ds-heading" data-size="lg">{selectedClass.name}</h1>
    <span class="ds-paragraph" data-size="sm">{selectedClass.school.name}</span>
  </div>

  <p class="ds-paragraph" data-size="sm" style="margin-top: var(--ds-size-2);">Din tilgang til klassen</p>
  <div class="access-info">
    {#if classAccess.classEntries.length > 0}
      {#each classAccess.classEntries as classEntry}
        <PrincipalAccessTag source={classEntry.source} name={ACCESS_TYPE_DISPLAY_NAMES[classEntry.type]} />
      {/each}
    {/if}

    {#if classAccess.programAreas.length > 0}
      {#each classAccess.programAreas as programArea}
        <PrincipalAccessTag source={programArea.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[programArea.type]} via ${programArea.name}`} />
      {/each}
    {/if}

    {#if classAccess.schools.length > 0}
      {#each classAccess.schools as school}
        <PrincipalAccessTag source={school.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[school.type]} for ${selectedClass.school.name}`} />
      {/each}
    {/if}
  </div>

  <div class="class-details" transition:slide>
    <ImportantGroupStuff groupImportantStuff={classSummaryDetails?.groupImportantInfo || null} school={selectedClass.school} group={selectedClass} />
  </div>

  <div class="ds-card class-students-container" data-variant="tinted" data-color="brand1">
    <details class="ds-details">
      <summary>Elever</summary>
      <div>
        <ul>
          {#each filteredStudents as classStudent}
            <li>
              <a class="ds-link" href={`/students/${classStudent._id}`}>{classStudent.name}</a>
            </li>
          {/each}
        </ul>
      </div>
    </details>
  </div>

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
        <NewDocument accessSchools={[selectedClass.school]} documentContentTemplates={data.documentContentTemplates} groupSystemId={selectedClass.systemId} />
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
        <!--<DocumentComponent {document} accessSchools={[selectedClass.school]} groupName={selectedClass.name} />-->
        {document.title}<br />
      {/each}
    {/if}
  </div>
</div>

<style>
  .page-header {
    padding-bottom: var(--ds-size-4);
  }

  .access-info {
    display: flex;
    gap: var(--ds-size-2);
    flex-wrap: wrap;
    padding-bottom: var(--ds-size-4);
  }

  .class-details {
    margin: var(--ds-size-4) 0;
  }

  .class-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .documents {
    display: flex;
    flex-direction: column;
    border-radius: 4px;
    margin-top: var(--ds-size-4);
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