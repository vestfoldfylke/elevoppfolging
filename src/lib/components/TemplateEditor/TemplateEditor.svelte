<script lang="ts">
  import { goto } from "$app/navigation"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { DocumentContentItem, DocumentContentTemplate } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"
  import DocumentContentItemComponent from "../Document/DocumentContentItem.svelte"
  import TemplateEditorItem from "./TemplateEditorItem.svelte"

  type TemplateEditorProps = {
    template: DocumentContentTemplate
  }

  let { template }: TemplateEditorProps = $props()

  // svelte-ignore state_referenced_locally (vi vil ha en kopi her, så kan den resettes hvis det trengs)
  let editableTemplate = $state(template)

  let previewMode = $state(Boolean(editableTemplate._id))

  let templateForm: HTMLFormElement | undefined = $state()

  const templateItems: (DocumentContentItem & { displayName: string })[] = [
    {
      displayName: "Overskrift",
      type: "h1",
      value: "Dette er en tittel"
    },
    {
      displayName: "Tekst-avsnitt",
      type: "p",
      value: "Dette er et avsnitt med litt tekst."
    },
    {
      type: "inputText",
      displayName: "Inputfelt (felt brukeren putter inn tekst i)",
      placeholder: "Heisann",
      label: "Beskrivelse av tekstfelt",
      value: "",
      required: true
    },
    {
      type: "textarea",
      displayName: "Tekstområde (felt brukeren putter inn mye tekst i)",
      label: "Beskrivelse av tekstfelt",
      value: "",
      initialRows: 3,
      required: true
    }
  ]

  const addTemplateItem = (type: string) => {
    const newItem = templateItems.find((item) => item.type === type)
    if (!newItem) {
      throw new Error("Ugyldig item-type")
    }
    editableTemplate.content.push(JSON.parse(JSON.stringify(newItem)))
  }

  const moveTemplateItem = (currentIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= editableTemplate.content.length || currentIndex === toIndex) {
      return
    }
    const itemToMove = editableTemplate.content[currentIndex]
    editableTemplate.content.splice(currentIndex, 1)
    editableTemplate.content.splice(toIndex, 0, itemToMove)
  }

  const removeTemplateItem = (index: number) => {
    editableTemplate.content.splice(index, 1)
  }

  const validateTemplate = (): boolean => {
    if (!templateForm) {
      throw new Error("Template editor form not found")
    }
    return templateForm.reportValidity()
  }

  const newTemplate = async (): Promise<void> => {
    const formIsValid = validateTemplate()
    if (!formIsValid) {
      return
    }

    const { templateId } = await apiFetch(`/api/templates`, {
      method: "POST",
      body: editableTemplate,
      headers: {
        "Content-Type": "application/json"
      }
    })

    previewMode = true
    // redirect and reload page data
    goto(`/admin/templates/${templateId}`, { invalidateAll: true })
  }

  const updateTemplate = async (): Promise<void> => {
    const formIsValid = validateTemplate()
    if (!formIsValid) {
      return
    }

    await apiFetch(`/api/templates/${editableTemplate._id}`, {
      method: "PUT",
      body: editableTemplate,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const deleteTemplate = async (): Promise<void> => {
    const confirmDelete = confirm("Er du heeeelt sikker på du vil slette denne malen da? Den blir heeeelt borte 😱")
    if (!confirmDelete) {
      return
    }

    await apiFetch(`/api/templates/${editableTemplate._id}`, {
      method: "DELETE"
    })
    // redirect and reload page data
    goto(`/admin/templates`, { invalidateAll: true })
  }
</script>

<div class="template-editor-container" class:hidden={previewMode}>
  <form bind:this={templateForm}>
    <div class="template-editor">
      <div class="template-metadata">
        <div>
          <label for="template-name">Notat-type navn</label>
          <input required id="template-name" type="text" bind:value={editableTemplate.name} />
        </div>
        <div>
          <label for="available-for-students">Elevnotat</label>
          <input id="available-for-students" type="checkbox" bind:checked={editableTemplate.availableForDocumentType.student} />
        </div>
        <div>
          <label for="available-for-groups">Gruppe-notat</label>
          <input id="available-for-groups" type="checkbox" bind:checked={editableTemplate.availableForDocumentType.group} />
        </div>
      </div>

      <div class="template-content">
        {#if editableTemplate.content.length === 0}
          <p>Ingen elementer i malen enda</p>
        {/if}
        {#each editableTemplate.content as _contentItem, index}
          <TemplateEditorItem bind:contentItem={editableTemplate.content[index]} index={index} contentItemsLength={editableTemplate.content.length} moveItem={(toIndex: number) => moveTemplateItem(index, toIndex)} removeItem={() => removeTemplateItem(index)} />
        {/each}
      </div>
    </div>
  </form>

  <div class="template-editor-actions">
    {#each templateItems as templateItem}
      <button type="button" onclick={() => addTemplateItem(templateItem.type)}><span class="material-symbols-outlined">add</span>{templateItem.displayName}</button>
    {/each}
  </div>
</div>

<div class="template-preview" class:hidden={!previewMode}>
  {#each editableTemplate.content as contentItem, index}
    <DocumentContentItemComponent editMode={true} {index} {contentItem} />
  {/each}
</div>

<div class="template-actions">
  {#if previewMode}
    <button type="button" onclick={() => previewMode = false}>Rediger mal</button>
  {:else}
    <button type="button" onclick={() => previewMode = true}>Forhåndsvis mal</button>
    {#if !editableTemplate._id}
      <AsyncButton buttonText="Lagre mal" onClick={newTemplate} />
    {:else}
      <AsyncButton buttonText="Lagre endringer" onClick={updateTemplate} reloadPageDataOnSuccess={true} />
      <AsyncButton buttonText="Slett mal" onClick={deleteTemplate} />
    {/if}
  {/if}
</div>

<style>
  .template-editor-container.hidden, .template-preview.hidden {
    display: none;
  }
  .template-editor-container {
    display: flex;
    flex-direction: column;
  }
  .template-editor {
    flex: 1;
  }
  .template-editor-actions {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 0rem;
  }
  .template-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>