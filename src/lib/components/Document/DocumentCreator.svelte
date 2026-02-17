<script lang="ts">
  import { enhance } from "$app/forms"
  import type { AccessType } from "$lib/types/app-types"
  import type { DocumentContentTemplate, EditorData } from "$lib/types/db/shared-types"
  import type { ActionData } from "../../../routes/students/[_id]/$types"
  import DocumentContent from "./DocumentContent.svelte"

  type PageProps = {
    form: ActionData
    accessTypes: AccessType[]
    documentContentTemplates: DocumentContentTemplate[]
  }

  let { form, accessTypes, documentContentTemplates }: PageProps = $props()
  let documentCreatorOpen = $state(false)
  let selectedTemplateId = $state()

  let selectedTemplate = $derived.by(() => {
    return documentContentTemplates.find((template) => template._id === selectedTemplateId) || documentContentTemplates[0]
  })
</script>

{#if !documentCreatorOpen}
  <div class="document-creator-actions">
    <button onclick={() => documentCreatorOpen = true}>Nytt notat</button>
  </div>
{/if}
{#if documentCreatorOpen}
  <div class="document-creator">
    <div class="document-header">
      <button class="document-title">
        <h2>Nytt notat</h2>
      </button>
    </div>
    <div class="document-container">
      <div class="document-content">
        <form method="POST" action="?/newDocumentAction" use:enhance={() => {
          return async ({ result, update }) => {

            
            if (result.type === "success") {
              documentCreatorOpen = false
            }
            
            console.log(result)
            update()
          }
        }}>
          <div class="document-content-item">
            <label for="type">
              Type
            </label>
            <select id="type" name="documentContentTemplateId" required bind:value={selectedTemplateId}>
              {#if !selectedTemplateId}
                <option value="" disabled selected>Ingen notat-typer tilgjengelig</option>
              {/if}
              {#each documentContentTemplates as documentContentTemplate, index}
                <option selected={Boolean(form?.createDocumentFailedData?.documentContentTemplateId) || index === 0} value={documentContentTemplate._id}>{documentContentTemplate.name}</option>
              {/each}
            </select>
            <input type="hidden" name="documentContentTemplateVersion" value={selectedTemplate.version} />
          </div>
          <div class="document-content-item">
            <label for="documentTitle">
              Tittel
            </label>
            <input id="documentTitle" name="documentTitle" type="text" value={form?.createDocumentFailedData?.documentTitle ?? ''} required>
          </div>
          <div class="document-content-item">
            {#if accessTypes.length > 1}
              <label for="schoolNumber">
                Skolenummer
              </label>
              <select id="schoolNumber" name="schoolNumber" required>
                <option value="" disabled selected>Velg skole</option>
                {#each accessTypes as access}
                  <!-- TODO: Add school name to AccessType -->
                  <option selected={Boolean(form?.createDocumentFailedData?.schoolNumber)} value={access.schoolNumber}>{access.schoolNumber}</option>
                {/each}
              </select>
            {:else}
              <input id="schoolNumber" name="schoolNumber" type="text" value={accessTypes[0]?.schoolNumber ?? ''} required hidden>
            {/if}
          </div>
          <br />
          <DocumentContent {form} content={selectedTemplate.content} editMode={true} />
          <div class="document-actions">
            <button type="submit">Legg til notat</button>
            <button onclick={() => documentCreatorOpen = false}>Avbryt</button>
          </div>
      </form>
      {#if form?.createDocumentFailedData?.errorMessage}<p class="error">{form.createDocumentFailedData.errorMessage}</p>{/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .document-container {
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
  }
  
  .document-content-item {
    margin-bottom: 0.5rem;
  }

  .document-header {
    display: flex;
    align-items: center;
  }
  .document-title {
    flex: 1;
    display: flex;
    cursor: pointer;
    justify-content: space-between;
    border: none;
  }
  .document-container > div {
    padding: 0.5rem;
    border-bottom: 1px solid #ccc;
  }
  .document-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
  }
</style>