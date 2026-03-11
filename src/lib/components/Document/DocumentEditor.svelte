<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { SchoolInfo, DocumentInput } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"
  import DocumentContentItem from "./DocumentContentItem.svelte"

  type EditorProps = {
    documentId?: string
    studentId?: string
    groupId?: string
    currentDocument: DocumentInput
    accessSchools: SchoolInfo[]
    closeEditor: () => void
  }

  let { documentId, studentId, groupId, accessSchools, currentDocument = $bindable(), closeEditor }: EditorProps = $props()

  let documentEditorForm: HTMLFormElement | undefined = $state()

  const newDocument = async (): Promise<void> => {
    if (!documentEditorForm) {
      throw new Error("Document editor form not found")
    }
    const formIsValid = documentEditorForm.reportValidity()
    if (!formIsValid) {
      throw new Error("Mangler påkrevd felt")
    }

    if (groupId) {
      throw new Error("Creating documents for groups is not supported yet")
    }

    const createDocumentRoute = `/api/students/${studentId}/documents` as const

    await apiFetch(createDocumentRoute, {
      method: "POST",
      body: currentDocument,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
</script>

<div class="document-content">
  <form bind:this={documentEditorForm}>
    {#if accessSchools.length > 1 && !documentId} <!-- Only show school selector when creating a new document and there are multiple access schools -->
      <div class="document-content-item">
        <label for="schoolNumber">
          Skole
        </label>
        <select id="schoolNumber" name="schoolNumber" bind:value={currentDocument.school} required>
          <option value="" disabled selected>Velg skole</option>
          {#each accessSchools as school}
            <option value={school}>{school.name}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="document-content-item">
      <label for="documentTitle">
        Tittel<span class="required-indicator">*</span>
      </label>
      <input id="documentTitle" name="documentTitle" type="text" bind:value={currentDocument.title} required>
    </div>
    {#each currentDocument.content as _contentItem, index}
      <DocumentContentItem bind:contentItem={currentDocument.content[index]} {index} editMode={true} />
    {/each}
  </form>
</div>
<div class="document-actions">
  {#if !documentId}
    <AsyncButton buttonText="Lagre notat" onClick={newDocument} reloadPageDataOnSuccess={true} callBackAfterReloadPageData={closeEditor} iconName="save" classList={["filled"]} />
  {/if}
  <button class="filled danger" onclick={closeEditor}><span class="material-symbols-outlined">close</span>Avbryt</button>
</div>

<style>
  .document-content {
    margin-top: 1rem;
  }
  .document-content-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .document-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>