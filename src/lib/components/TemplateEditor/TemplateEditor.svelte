<script lang="ts">
  import { goto } from "$app/navigation"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { DocumentContentItem, DocumentContentTemplate, DocumentRadioGroupItem } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"
  import DocumentContentItemComponent from "../Document/DocumentContentItem.svelte"
    import { templateEditorContentItemIcons, templateEditorContentItemNames } from "./template-editor-constants";
  import TemplateEditorItem from "./TemplateEditorItem.svelte"

  type TemplateEditorProps = {
    template: DocumentContentTemplate
  }

  let { template }: TemplateEditorProps = $props()

  // svelte-ignore state_referenced_locally (vi vil ha en kopi her, så kan den resettes hvis det trengs via #key)
  let editableTemplate = $state(template)

  let previewMode = $state(Boolean(editableTemplate._id))

  let templateForm: HTMLFormElement | undefined = $state()

  const templateItems: DocumentContentItem[] = [
    {
      type: "header",
      value: "Dette er en tittel"
    },
    {
      type: "paragraph",
      value: "Dette er et avsnitt med litt tekst."
    },
    {
      type: "inputText",
      placeholder: "Heisann",
      label: "Beskrivelse av tekstfelt",
      helpText: "",
      value: "",
      required: true
    },
    {
      type: "textarea",
      label: "Beskrivelse av tekstområde",
      helpText: "",
      placeholder: "",
      value: "",
      initialRows: 3,
      required: true
    },
    {
      type: "radioGroup",
      selectedValue: "",
      header: "Beskrivelse av valggruppe",
      items: [
        {
          label: "Valg 1",
          value: crypto.randomUUID()
        },
        {
          label: "Valg 2",
          value: crypto.randomUUID()
        }
      ]
    },
    {
      type: "checkboxGroup",
      selectedValues: [],
      header: "Beskrivelse av avkrysningsgruppe",
      items: [
        {
          label: "Valg 1",
          value: crypto.randomUUID()
        },
        {
          label: "Valg 2",
          value: crypto.randomUUID()
        }
      ]
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
      throw new Error(INVALID_FORM_MESSAGE)
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
    goto(`/system/templates/${templateId}`, { invalidateAll: true })
  }

  const updateTemplate = async (): Promise<void> => {
    const formIsValid = validateTemplate()
    if (!formIsValid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    await apiFetch(`/api/templates/${editableTemplate._id as NoSlashString}`, {
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

    await apiFetch(`/api/templates/${editableTemplate._id as NoSlashString}`, {
      method: "DELETE"
    })
    // redirect and reload page data
    goto(`/system/templates`, { invalidateAll: true })
  }
</script>

<div class="template-editor-container" class:hidden={previewMode}>
  <form bind:this={templateForm}>
    <ds-field class="ds-field">
      <label for="template-name" class="ds-label" data-weight="medium">
        Navn på notat-typen
      </label>
      <input required id="template-name" class="ds-input" type="text" bind:value={editableTemplate.name} />
    </ds-field>

    <ds-field class="ds-field">
      <label for="template-sort" class="ds-label" data-weight="medium">
        Sorteringsrekkefølge
      </label>
      <input required id="template-sort" class="ds-input" type="number" bind:value={editableTemplate.sort} />
    </ds-field>

    <div class="template-editor">
      <div class="template-availability-options">
        <fieldset class="ds-fieldset content-item">
          <legend class="ds-label" data-weight="medium">
            Tilgjengelig som
          </legend>
          <ds-field class="ds-field">
            <input class="ds-input" id="available-for-students" type="checkbox" bind:checked={editableTemplate.availableForDocumentType.student} />
            <label class="ds-label" for="available-for-students">Elevnotat</label>
          </ds-field>
          <ds-field class="ds-field">
            <input class="ds-input" id="available-for-groups" type="checkbox" bind:checked={editableTemplate.availableForDocumentType.group} />
            <label class="ds-label" for="available-for-groups">Klassenotat</label>
          </ds-field>
        </fieldset>
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
        <button class="ds-button" data-variant="secondary" type="button" onclick={() => addTemplateItem(templateItem.type)}><span class="material-symbols-outlined">{templateEditorContentItemIcons[templateItem.type]}</span>{templateEditorContentItemNames[templateItem.type]}</button>
      {/each}
    </div>
  </div>
</div>

<div class="template-preview" class:hidden={!previewMode}>
  {#each editableTemplate.content as contentItem, index}
    <DocumentContentItemComponent editMode={true} previewMode={true} {index} {contentItem} />
  {/each}
</div>

<hr aria-hidden="true" class="ds-divider"/>

<div class="template-actions">
  {#if previewMode}
    <button class="ds-button" data-variant="secondary" type="button" onclick={() => previewMode = false}><span class="material-symbols-outlined">edit</span>Rediger mal</button>
  {:else}
    {#if !editableTemplate._id}
      <AsyncButton buttonText="Lagre mal" onClick={newTemplate} iconName="save" />
    {:else}
      <AsyncButton disabled={JSON.stringify(editableTemplate) === JSON.stringify(template)} buttonText="Lagre endringer" onClick={updateTemplate} reloadPageDataOnSuccess={true} iconName="save" />
    {/if}
    <button class="ds-button" data-variant="secondary" type="button" onclick={() => previewMode = true}><span class="material-symbols-outlined">visibility</span>Forhåndsvis mal</button>
  {/if}
  <a href="/system/templates" class="ds-button" data-variant="secondary"><span class="material-symbols-outlined">arrow_back</span>Tilbake til maler</a>
  {#if editableTemplate._id}
    <AsyncButton buttonText="Slett mal" onClick={deleteTemplate} iconName="delete" color="danger" />
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
    padding: 1rem 0rem;
    display: flex;
    gap: 0.5rem;
  }
  .template-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>