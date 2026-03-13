<script lang="ts">
  import type { DocumentContentTemplate, DocumentInput, SchoolInfo } from "$lib/types/db/shared-types"
  import DocumentEditor from "./DocumentEditor.svelte"

  type PageProps = {
    documentContentTemplates: DocumentContentTemplate[]
    accessSchools: SchoolInfo[]
    studentId?: string
    groupId?: string
  }

  let { documentContentTemplates, accessSchools, studentId, groupId }: PageProps = $props()

  let creatorOpen = $state(false)

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

{#if !creatorOpen}
  <div>
    <button class="filled" onclick={() => creatorOpen = true}><span class="material-symbols-outlined">note_add</span>Nytt notat</button>
  </div>
{:else}
  <div class="template-selector">
    <label for="type">
      Type notat
    </label>
    <br />
    <select id="type" name="documentContentTemplateId" onchange={(event) => changeDocumentTemplate((event.target as HTMLSelectElement).value)}>
      {#each newDocumentTemplates as documentTemplate}
        <option value={documentTemplate.template._id}>{documentTemplate.template.name}</option>
      {/each}
    </select>
  </div>

  <div class="document-container section-box">
    <div class="document-header">
      <h2>{newDocument.template.name}: {newDocument.title}</h2>
      <div>{newDocument.school.name}</div>
    </div>
    <DocumentEditor {studentId} {groupId} {accessSchools} bind:currentDocument={newDocument} closeEditor={() => creatorOpen = false} />
  </div>
{/if}

<style>
  .template-selector {
    margin-bottom: 1rem;
  }
  .document-container {
    display: flex;
    flex-direction: column;
  }
  h2 {
    margin: 0rem;
  }
</style>