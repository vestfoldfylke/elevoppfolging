<script lang="ts">
  import { goto } from "$app/navigation"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import type { DocumentContentItem, DocumentContentTemplate, DocumentRadioGroupItem } from "$lib/types/db/shared-types"
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

  const templateItems: (DocumentContentItem & { displayName: string, iconName: string })[] = [
    {
      displayName: "Overskrift",
      iconName: "title",
      type: "header",
      value: "Dette er en tittel"
    },
    {
      displayName: "Tekst-avsnitt",
      iconName: "text_fields",
      type: "paragraph",
      value: "Dette er et avsnitt med litt tekst."
    },
    {
      type: "inputText",
      iconName: "text_fields_alt",
      displayName: "Inputfelt (felt brukeren putter inn tekst i)",
      placeholder: "Heisann",
      label: "Beskrivelse av tekstfelt",
      helpText: "",
      value: "",
      required: true
    },
    {
      type: "textarea",
      iconName: "format_align_left",
      displayName: "Tekstområde (felt brukeren putter inn mye tekst i)",
      label: "Beskrivelse av tekstfelt",
      helpText: "",
      placeholder: "",
      value: "",
      initialRows: 3,
      required: true
    },
    {
      type: "radioGroup",
      iconName: "task_alt",
      displayName: "Valggruppe (brukeren kan velge ett alternativ)",
      selectedValue: "",
      header: "Beskrivelse av valggruppe",
      items: [
        {
          label: "",
          value: crypto.randomUUID()
        },
        {
          label: "",
          value: crypto.randomUUID()
        }
      ],
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
      throw new Error("Mangler påkrevd felt")
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
      throw new Error("Mangler påkrevd felt")
    }

    await apiFetch(`/api/templates/${editableTemplate._id}`, {
      method: "PUT",
      body: editableTemplate,
      headers: {
        "Content-Type": "application/json"
      }
    })

    previewMode = true
  }

  const deleteTemplate = async (): Promise<void> => {
    const confirmDelete = confirm("Er du heeeelt sikker på du vil slette denne malen da? Den vil ikke kunne brukes lenger. Dokumentene som er laget med malen vil ikke bli slettet.")
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
      <div class="template-name">
        <label for="template-name">Navn på notat-typen</label>
        <input required id="template-name" type="text" bind:value={editableTemplate.name} />
      </div>

      <div class="template-availability-options">
        <strong>Tilgjengelig som:</strong>
        <br />
        <label for="available-for-students">Elevnotat</label>
        <input id="available-for-students" type="checkbox" bind:checked={editableTemplate.availableForDocumentType.student} />

        <label for="available-for-groups">Klassenotat</label>
        <input id="available-for-groups" type="checkbox" bind:checked={editableTemplate.availableForDocumentType.group} />
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
    <strong>Legg til element:</strong>
    <div class="template-editor-actions-buttons">
      {#each templateItems as templateItem}
        <button type="button" onclick={() => addTemplateItem(templateItem.type)}><span class="material-symbols-outlined">{templateItem.iconName}</span>{templateItem.displayName}</button>
      {/each}
    </div>
  </div>
</div>

<div class="template-preview" class:hidden={!previewMode}>
  {#each editableTemplate.content as contentItem, index}
    <DocumentContentItemComponent editMode={true} previewMode={true} {index} {contentItem} />
  {/each}
</div>

<div class="template-actions">
  {#if previewMode}
    <button type="button" onclick={() => previewMode = false}><span class="material-symbols-outlined">edit</span>Rediger mal</button>
  {:else}
    <button type="button" onclick={() => previewMode = true}><span class="material-symbols-outlined">visibility</span>Forhåndsvis mal</button>
    {#if !editableTemplate._id}
      <AsyncButton buttonText="Lagre mal" onClick={newTemplate} iconName="save" />
    {:else}
      <AsyncButton disabled={JSON.stringify(editableTemplate) === JSON.stringify(template)} buttonText="Lagre endringer" onClick={updateTemplate} reloadPageDataOnSuccess={true} iconName="save" classList={["filled"]} />
      <AsyncButton buttonText="Slett mal" onClick={deleteTemplate} iconName="delete" classList={["filled", "danger"]} />
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
  .template-name {
    display: flex;
    flex-direction: column;
    margin: 1rem 0rem;
  }
  .template-name > input {
    max-width: 20rem;
  }
  .template-availability-options {
    margin: 1rem 0rem;
  }

  .template-editor-actions {
    margin: 1rem 0rem;
  }
  .template-editor-actions-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .template-actions {
    border-top: 1px solid var(--color-primary);
    padding: 1rem 0rem;
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
  }
  .template-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>