<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { Document, School } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"
  import DocumentContentItem from "./DocumentContentItem.svelte"

  type EditorProps = {
    currentDocument: Document
    accessSchools: School[]
    closeEditor: () => void
  }

  let { accessSchools, currentDocument = $bindable(), closeEditor }: EditorProps = $props()

  let documentEditorForm: HTMLFormElement | undefined = $state()

  const newDocument = async (): Promise<void> => {
    if (!documentEditorForm) {
      throw new Error("Document editor form not found")
    }
    const formIsValid = documentEditorForm.reportValidity()
    if (!formIsValid) {
      throw new Error("Form is not valid")
    }

    await apiFetch(`/api/documents`, {
      method: "POST",
      body: currentDocument,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
</script>

<div class="document-container">
  <h2>{currentDocument.template.name}: {currentDocument.title}</h2>
  <div>{currentDocument.school.name}</div>
  <div class="document-content">
    <form bind:this={documentEditorForm}>
      <div class="document-content-item">
        <label for="documentTitle">
          Tittel
        </label>
        <input id="documentTitle" name="documentTitle" type="text" bind:value={currentDocument.title} required>
      </div>
      {#if accessSchools.length > 1}
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
      <br />
      {#each currentDocument.content as _contentItem, index}
        <DocumentContentItem bind:contentItem={currentDocument.content[index]} {index} editMode={true} />
      {/each}
    </form>
  </div>
  <div class="document-actions">
    {#if !currentDocument._id}
      <AsyncButton buttonText="Lagre nytt dokument" onClick={newDocument} reloadPageDataOnSuccess={true} callBackAfterReloadPageData={closeEditor} />
      <button onclick={closeEditor}>Avbryt</button>
    {/if}
  </div>
</div>

<style>
  .document-container {
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
  }
  
  .document-content-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
</style>