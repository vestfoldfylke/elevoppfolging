<script lang="ts">
  import DocumentComponent from "$lib/components/Document/Document.svelte"
  import NewDocument from "$lib/components/Document/NewDocument.svelte"
  import ImportantGroupStuff from "$lib/components/ImportantGroupStuff.svelte"
  import PrincipalAccessTag from "$lib/components/PrincipalAccessTag.svelte"
  import { authorizeDeleteGroupDocument, authorizeEditGroupDocument, authorizeEditGroupImportantStuff } from "$lib/shared-authorization/authorization"
  import type { PrincipalAccessStudent, TemplateInfo } from "$lib/types/app-types"
  import type { GroupDocument, GroupImportantStuff } from "$lib/types/db/shared-types"
  import { ACCESS_TYPE_DISPLAY_NAMES } from "$lib/utils/access-constants"
  import type { PageProps } from "./$types"

  type ClassSummaryDetails = { groupImportantInfo: GroupImportantStuff | null } | undefined

  let { data }: PageProps = $props()

  let sortBy = $state<"name">("name")
  let sortDirection = $state<"ascending" | "descending">("ascending")

  let sortedStudents = $derived.by(() => {
    return data.classStudents.sort((a: PrincipalAccessStudent, b: PrincipalAccessStudent) => {
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
      data.groupImportantStuff.find((importantStuff) => importantStuff.school.schoolNumber === data.classGroup.school.schoolNumber) || data.groupImportantStuff[0] || null
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
    data.documents.forEach((document: GroupDocument) => {
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

  let filteredDocuments: GroupDocument[] = $derived.by(() => {
    if (selectedDocumentTypes.length === 0) {
      return data.documents
    }

    return data.documents.filter((document: GroupDocument) => selectedDocumentTypes.includes(document.template._id))
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
    <h1 class="ds-heading" data-size="lg">{data.classGroup.name}</h1>
    <span class="ds-paragraph" data-size="sm">{data.classGroup.school.name}</span>
  </div>

  <p class="ds-paragraph" data-size="sm" style="margin-top: var(--ds-size-2);">Din tilgang til klassen</p>
  <div class="access-info">
    {#if data.classGroup.principalAccessForStudentClassGroup.classEntries.length > 0}
      {#each data.classGroup.principalAccessForStudentClassGroup.classEntries as classEntry}
        <PrincipalAccessTag source={classEntry.source} name={ACCESS_TYPE_DISPLAY_NAMES[classEntry.type]} />
      {/each}
    {/if}

    {#if data.classGroup.principalAccessForStudentClassGroup.programAreas.length > 0}
      {#each data.classGroup.principalAccessForStudentClassGroup.programAreas as programArea}
        <PrincipalAccessTag source={programArea.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[programArea.type]} via ${programArea.name}`} />
      {/each}
    {/if}

    {#if data.classGroup.principalAccessForStudentClassGroup.schools.length > 0}
      {#each data.classGroup.principalAccessForStudentClassGroup.schools as school}
        <PrincipalAccessTag source={school.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[school.type]} ved ${data.classGroup.school.name}`} />
      {/each}
    {/if}

    {#if data.classGroup.principalAccessForStudentClassGroup.allStudentsAtSchoolEntries.length > 0}
      {#each data.classGroup.principalAccessForStudentClassGroup.allStudentsAtSchoolEntries as allStudentsAtSchool}
        <PrincipalAccessTag source={allStudentsAtSchool.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[allStudentsAtSchool.type]} ved ${data.classGroup.school.name}`} />
      {/each}
    {/if}

    {#if data.classGroup.principalAccessForStudentClassGroup.onlyAccessViaStudentAccess}
      <PrincipalAccessTag source={"AUTO"} name={`Tilgang til en eller flere elever i klassen ved ${data.classGroup.school.name}`} />
    {/if}
  </div>

  <div class="class-details">
    <ImportantGroupStuff canEdit={authorizeEditGroupImportantStuff({ studentClassGroupAccess: data.classGroup.principalAccessForStudentClassGroup }).authorized} groupImportantStuff={classSummaryDetails?.groupImportantInfo || null} school={data.classGroup.school} group={data.classGroup} />
  </div>

  <div class="ds-card teacher-details" data-variant="tinted" data-color="brand3">
    <div class="card-header">
      <div class="card-title">
        <span class="material-symbols-outlined">info</span>
        {#if data.classGroup.teachers.length === 0}
          <h2 class="ds-heading" data-size="sm">Ingen kontaktlærere</h2>
        {:else}
          <h2 class="ds-heading" data-size="sm">Kontaktlærer{data.classGroup.teachers.length > 1 ? "e" : ""}</h2>
        {/if}
      </div>
    </div>
    <div>
      <ul class="ds-list">
        {#each data.classGroup.teachers as teacher}
          <li>{teacher.name}</li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="ds-card class-students-container" data-variant="tinted" data-color="brand1">
    <details class="ds-details">
      <summary>
        <p>{data.classGroup.principalAccessForStudentClassGroup.onlyAccessViaStudentAccess ? "Elever du har tilgang til i denne klassen" : "Elever"}</p>
      </summary>
      <div>
        <ul>
          {#each sortedStudents as classStudent}
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
        <NewDocument accessSchools={[data.classGroup.school]} documentContentTemplates={data.documentContentTemplates} groupSystemId={data.classGroup.systemId} groupName={data.classGroup.name} />
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
        <DocumentComponent {document} accessSchools={[data.classGroup.school]} canEditDocument={authorizeEditGroupDocument({ authenticatedPrincipal: data.authenticatedPrincipal, document }).authorized} canRemoveDocument={authorizeDeleteGroupDocument({ principalAccess: data.principalAccess, document }).authorized} groupName={data.classGroup.name} principalClasses={data.principalAccessStudentClassGroups} />
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

  .class-details, .teacher-details {
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