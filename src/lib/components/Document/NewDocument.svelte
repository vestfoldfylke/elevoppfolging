<script lang="ts">
  import type { Document, DocumentContentTemplate, EditorData, School } from "$lib/types/db/shared-types"
  import DocumentEditor from "./DocumentEditor.svelte"

  type PageProps = {
    documentContentTemplates: DocumentContentTemplate[]
    accessSchools: School[]
    studentId?: string
    groupId?: string
  }

  let { documentContentTemplates, accessSchools, studentId, groupId }: PageProps = $props()

  let creatorOpen = $state(false)

  $effect(() => {
    if (!studentId && !groupId) {
      // Legg til sjekk om vi trenger gruppenotater
      throw new Error("Student ID or Group ID is required to create a new document")
    }
    if (studentId && groupId) {
      throw new Error("Both Student ID and Group ID provided, only one should be provided")
    }

    if (accessSchools.length === 0) {
      throw new Error("At least one access school is required to create a new document")
    }

    if (documentContentTemplates.length === 0) {
      throw new Error("At least one document content template is required to create a new document")
    }
  })

  const mockEditor: EditorData = {
    at: "samma det",
    by: {
      entraUserId: "samma det",
      fallbackName: "Samma det"
    }
  }

  const newDocumentTemplate = (template: DocumentContentTemplate): Document => {
    const newDocumentFromTemplate: Document = {
      _id: "",
      title: "",
      content: template.content,
      template: {
        _id: template._id,
        name: template.name,
        version: template.version
      },
      created: mockEditor,
      modified: mockEditor,
      messages: [],
      school: accessSchools[0],
      student: studentId ? { _id: studentId } : undefined,
      group: groupId ? { systemId: groupId } : undefined
    }
    return newDocumentFromTemplate
  }

  // svelte-ignore state_referenced_locally det går bra
  const newDocumentTemplates = documentContentTemplates.map((template) => newDocumentTemplate(template))

  let newDocument: Document = $state(newDocumentTemplates[0])

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

  <div class="document-container box-container">
    <div class="document-header">
      <h2>{newDocument.template.name}: {newDocument.title}</h2>
      <div>{newDocument.school.name}</div>
    </div>
    <DocumentEditor {accessSchools} bind:currentDocument={newDocument} closeEditor={() => creatorOpen = false} />
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