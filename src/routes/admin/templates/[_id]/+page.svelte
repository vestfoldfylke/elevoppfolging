<script lang="ts">
  import { enhance } from "$app/forms"
  import DocumentContent from "$lib/components/Document/DocumentContent.svelte";
  import TemplateEditor from "$lib/components/TemplateEditor/TemplateEditor.svelte"
  import type { DocumentContentTemplate } from "$lib/types/db/shared-types";
  import type { PageProps } from "./$types"

  let { data, form }: PageProps = $props()

  // svelte-ignore state_referenced_locally det er det vi vil for å kunne resette eventuelle endringer
  let currentTemplate: DocumentContentTemplate = $state(JSON.parse(JSON.stringify(data.template)))
  
  let previewMode = $state(false)

  let validateTemplate: () => boolean = $state(() => {
    console.log("JEG SKAL BLI OVERRIDET")
    return false
  })

  const validateAndSubmit = (event: Event) => {
    const valid = validateTemplate()
    if (!valid) {
      event.preventDefault()
      console.log("Template is not valid")
      return
    }
    console.log("Template is valid, submitting form")
  }

</script>

<h1>{data.template.name || "Ny notat-mal"}</h1>

<div class="template-editor" class:invisible={previewMode}>
  <TemplateEditor bind:currentTemplate={currentTemplate} bind:validateTemplate={validateTemplate} />
</div>

<div class="template-preview" class:invisible={!previewMode}>
  <DocumentContent editMode={true} form={null} content={currentTemplate.content} />
</div>

<div class="template-actions">
  {#if !previewMode}
    {#if !currentTemplate._id}
      <form method="POST" action="?/newDocumentContentTemplateAction" use:enhance>
      <input type="hidden" name="templateData" value={JSON.stringify(currentTemplate)} />
        <button type="submit" onclick={(event) => validateAndSubmit(event)}>Lagre mal</button>
      </form>
    {/if}

    {#if currentTemplate._id}
      <form method="POST" action="?/deleteDocumentContentTemplateAction" use:enhance>
        <input type="hidden" name="templateId" value={data.template._id} />
        <button type="submit">Slett mal</button>
      </form>

      <form method="POST" action="?/updateDocumentContentTemplateAction" use:enhance>
        <input type="hidden" name="templateData" value={JSON.stringify(currentTemplate)} />
        <button type="submit" onclick={(event) => validateAndSubmit(event)}>Lagre endringer</button>
      </form>
    {/if}

    {#if form?.message}
      <p>{form.message}</p>
    {/if}
  {/if}

  <button onclick={() => previewMode = !previewMode}>{previewMode ? "Rediger mal" : "Forhåndsvisning"}</button>
</div>


<style>
  .invisible {
    display: none;
  }

</style>
