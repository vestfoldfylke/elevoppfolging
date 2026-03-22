<script lang="ts">
  import type { DocumentContentTemplate, DocumentInput, SchoolInfo } from "$lib/types/db/shared-types"
  import DocumentEditor from "./DocumentEditor.svelte"

  type PageProps = {
    documentContentTemplates: DocumentContentTemplate[]
    accessSchools: SchoolInfo[]
    creatorOpen: boolean
    studentId?: string
    groupId?: string
  }

  let { documentContentTemplates, accessSchools, creatorOpen = $bindable(), studentId, groupId }: PageProps = $props()

  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupId
  if (!studentId && !groupId) {
    throw new Error("Student ID or Group ID is required to create a new document")
  }
  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupId
  if (studentId && groupId) {
    throw new Error("Both Student ID and Group ID provided, only one should be provided")
  }
  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupId
  if (accessSchools.length === 0) {
    throw new Error("At least one access school is required to create a new document")
  }
  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupId
  if (documentContentTemplates.length === 0) {
    throw new Error("At least one document content template is required to create a new document")
  }

  const newDocumentTemplate = (template: DocumentContentTemplate): DocumentInput => {
    const newDocumentFromTemplate: DocumentInput = {
      title: "",
      content: template.content,
      template: {
        _id: template._id,
        name: template.name,
        version: template.version
      },
      school: accessSchools[0]
    }
    return newDocumentFromTemplate
  }

  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupId TODO - sjekk om det skal være derived
  const newDocumentTemplates = documentContentTemplates.map((template) => newDocumentTemplate(template))

  let newDocument: DocumentInput = $state(newDocumentTemplates[0])

  const changeDocumentTemplate = (templateId: string) => {
    // TODO - add check to see if there are unsaved changes and warn the user before changing the template
    const documentTemplate = newDocumentTemplates.find((documentTemplate) => documentTemplate.template._id === templateId)
    if (!documentTemplate) {
      throw new Error("Template not found")
    }
    newDocument = documentTemplate
  }
</script>

<div class="template-selector">
  <ds-field class="ds-field">
    <label for="document-type" class="ds-label" data-weight="medium">Notat-type</label>
    <select id="document-type" class="ds-input" data-width="auto" onchange={(event) => changeDocumentTemplate((event.target as HTMLSelectElement).value)}>
      {#each newDocumentTemplates as documentTemplate}
        <option value={documentTemplate.template._id}>{documentTemplate.template.name}</option>
      {/each}
    </select>
  </ds-field>
</div>


<div class="ds-card" data-variant="default" data-color="accent" style="margin-bottom: var(--ds-size-6);">
  <h2 class="ds-heading">{newDocument.template.name}: {newDocument.title}</h2>
  <div class="ds-paragraph" data-size="sm">{newDocument.school.name}</div>
  <DocumentEditor {studentId} {groupId} {accessSchools} bind:currentDocument={newDocument} closeEditor={() => creatorOpen = false} />
</div>

<style>
  .template-selector {
    margin-bottom: 1rem;
  }
</style>