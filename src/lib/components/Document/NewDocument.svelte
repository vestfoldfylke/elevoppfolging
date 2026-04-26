<script lang="ts">
  import type { StudentAccessPerson } from "$lib/types/app-types"
  import type { DocumentContentTemplate, DocumentInput, SchoolInfo } from "$lib/types/db/shared-types"
  import DocumentEditor from "./DocumentEditor.svelte"

  type PageProps = {
    documentContentTemplates: DocumentContentTemplate[]
    accessSchools: SchoolInfo[]
    studentId?: string
    groupSystemId?: string
    studentDataSharingConsent?: boolean
    studentAccessPersons?: StudentAccessPerson[]
    emailAlertAvailable?: boolean
  }

  let { documentContentTemplates, accessSchools, studentId, groupSystemId, studentDataSharingConsent, studentAccessPersons, emailAlertAvailable }: PageProps = $props()

  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupSystemId
  if (!studentId && !groupSystemId) {
    throw new Error("Student ID or Group System ID is required to create a new document")
  }
  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupSystemId
  if (studentId && groupSystemId) {
    throw new Error("Both Student ID and Group System ID provided, only one should be provided")
  }
  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupSystemId
  if (accessSchools.length === 0) {
    throw new Error("At least one access school is required to create a new document")
  }
  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupSystemId
  if (documentContentTemplates.length === 0) {
    throw new Error("At least one document content template is required to create a new document")
  }

  let newDocumentDialog: HTMLDialogElement | undefined

  const newDocumentTemplate = (template: DocumentContentTemplate): DocumentInput => {
    return {
      title: "",
      content: template.content,
      template: {
        _id: template._id,
        name: template.name,
        version: template.version
      },
      school: accessSchools[0],
      documentAccess: "EXCLUDE_SUBJECT_TEACHERS"
    }
  }

  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupSystemId TODO - sjekk om det skal være derived
  const newDocumentTemplates = documentContentTemplates.map((template) => newDocumentTemplate(template))

  let newDocument: DocumentInput | null = $state(null)

  const changeDocumentTemplate = (selectedItem: EventTarget | null) => {
    if (!selectedItem) {
      newDocument = null
      return
    }

    const templateId: string | undefined = (selectedItem as HTMLSelectElement)?.value
    if (!templateId) {
      newDocument = null
      return
    }

    const documentTemplate = newDocumentTemplates.find((documentTemplate) => documentTemplate.template._id === templateId)
    if (!documentTemplate) {
      throw new Error("Template not found")
    }
    newDocument = documentTemplate
  }

  const closeEditor = () => {
    newDocument = null
    if (newDocumentDialog?.open) {
      newDocumentDialog.close()
    }
  }
</script>

<button class="ds-button" data-variant="primary" type="button" command="show-modal" commandfor="new-document-modal"><span class="material-symbols-outlined">note_add</span>Nytt notat</button>

<dialog class="ds-dialog document-dialog" data-placement="center" id="new-document-modal" bind:this={newDocumentDialog}>
  <button class="ds-button close-dialog-button" data-icon="true" data-variant="tertiary" type="button" aria-label="Lukk dialogvindu" data-color="neutral" command="close" commandfor="new-document-modal" onclick={() => newDocument = null}></button>
  
  <div class="ds-dialog__block">
    <div class="template-selector">
      <h2 class="ds-heading">Nytt notat</h2>
      <ds-field class="ds-field">
        <label for="document-type" class="ds-label" data-weight="medium">Notat-type</label>
        <select id="document-type" class="ds-input" data-width="auto" onchange={(event) => changeDocumentTemplate(event.target)}>
          {#if !newDocument}
            <option selected value="">Velg en notat-type</option>
          {/if}
          {#each newDocumentTemplates as documentTemplate}
            <option value={documentTemplate.template._id}>{documentTemplate.template.name}</option>
          {/each}
        </select>
      </ds-field>
    </div>

    {#if newDocument}
      <hr aria-hidden="true" class="ds-divider"/>
      <br />
      <div class="ds-paragraph" data-size="sm">{newDocument.school.name}</div>
      <h2 class="ds-heading">{newDocument.template.name}: {newDocument.title}</h2>
      <DocumentEditor {studentId} {groupSystemId} {accessSchools} bind:currentDocument={newDocument} {studentDataSharingConsent} {studentAccessPersons} closeEditor={closeEditor} />
    {/if}
  </div>
</dialog>

<style>
  .template-selector {
    margin-bottom: 1rem;
  }
</style>