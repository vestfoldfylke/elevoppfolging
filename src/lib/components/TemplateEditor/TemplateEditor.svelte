<script lang="ts">
  import { goto } from "$app/navigation"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { createEditableDraft, type EditableDraft } from "$lib/runes/create-editable-draft.svelte"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { DocumentContentItem, DocumentContentTemplate } from "$lib/types/db/shared-types"
  import AsyncButton, { type AsyncButtonResult } from "../AsyncButton.svelte"
  import DocumentContentItemComponent from "../Document/DocumentContentItem.svelte"
  import TemplateEditorItem from "./TemplateEditorItem.svelte"
  import { templateEditorContentItemIcons, templateEditorContentItemNames } from "./template-editor-constants"

  type TemplateEditorProps = {
    template: DocumentContentTemplate
  }

  let { template }: TemplateEditorProps = $props()

  let editableTemplate: EditableDraft<DocumentContentTemplate> = createEditableDraft(() => template)

  let previewMode = $state(Boolean(editableTemplate.draft._id))

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
      type: "info",
      value:
        "Dette er en informasjonsboks. Den kan brukes til å gi ekstra informasjon, tips eller advarsler til brukeren som skal fylle ut feltene i et notat. Du kan også legge til lenker i teksten ved å bruke formatet [lenketekst](url). For eksempel: Søk opp ting hos [Google](https://www.google.com) for å finne mer informasjon."
    },
    {
      type: "inputText",
      placeholder: "",
      label: "Beskrivelse av tekstfelt",
      helpText: "En hjelpende tekst som forklarer mer om hva som skal fylles ut i tekstfeltet",
      value: "",
      required: true
    },
    {
      type: "textarea",
      label: "Beskrivelse av tekstområde",
      helpText: "En hjelpende tekst som forklarer mer om hva som skal fylles ut i tekstområdet",
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
    editableTemplate.draft.content.push(JSON.parse(JSON.stringify(newItem)))
  }

  const moveTemplateItem = (currentIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= editableTemplate.draft.content.length || currentIndex === toIndex) {
      return
    }
    const itemToMove = editableTemplate.draft.content[currentIndex]
    editableTemplate.draft.content.splice(currentIndex, 1)
    editableTemplate.draft.content.splice(toIndex, 0, itemToMove)
  }

  const removeTemplateItem = (index: number) => {
    editableTemplate.draft.content.splice(index, 1)
  }

  const validateTemplate = (): boolean => {
    if (!templateForm) {
      throw new Error("Template editor form not found")
    }
    return templateForm.reportValidity()
  }

  const newTemplate = async (): Promise<AsyncButtonResult> => {
    const formIsValid = validateTemplate()

    if (!formIsValid) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    if (editableTemplate.draft.content.length === 0) {
      return { status: "error", message: "Malen må ha minst ett element" }
    }

    const { templateId } = await apiFetch(`/api/templates`, {
      method: "POST",
      body: editableTemplate.draft,
      headers: {
        "Content-Type": "application/json"
      }
    })

    previewMode = true

    // redirect and reload page data
    await goto(`/system/templates/${templateId}`, { invalidateAll: true })

    return { status: "success" }
  }

  const updateTemplate = async (): Promise<AsyncButtonResult> => {
    const formIsValid = validateTemplate()

    if (!formIsValid) {
      return { status: "error", message: INVALID_FORM_MESSAGE }
    }

    if (editableTemplate.draft.content.length === 0) {
      return { status: "error", message: "Malen må ha minst ett element" }
    }

    await apiFetch(`/api/templates/${editableTemplate.draft._id as NoSlashString}`, {
      method: "PUT",
      body: editableTemplate.draft,
      headers: {
        "Content-Type": "application/json"
      }
    })

    return {
      status: "success",
      reloadPageData: true,
      callBack: () => {
        previewMode = true
      }
    }
  }

  const deleteTemplate = async (): Promise<AsyncButtonResult> => {
    const confirmDelete = confirm("Er du heeeelt sikker på du vil slette denne malen da? Den vil ikke kunne brukes lenger. Dokumentene som er laget med malen vil ikke bli slettet.")
    if (!confirmDelete) {
      return { status: "cancelled" }
    }

    await apiFetch(`/api/templates/${editableTemplate.draft._id as NoSlashString}`, {
      method: "DELETE"
    })

    // redirect and reload page data
    await goto(`/system/templates`, { invalidateAll: true })

    return { status: "success" }
  }
</script>

<div class="template-editor-container" class:hidden={previewMode}>
  <form bind:this={templateForm}>
    <ds-field class="ds-field">
      <label for="template-name" class="ds-label" data-weight="medium">
        Navn på notat-typen
      </label>
      <input required id="template-name" class="ds-input" type="text" bind:value={editableTemplate.draft.name} />
    </ds-field>

    <ds-field class="ds-field">
      <label for="template-sort" class="ds-label" data-weight="medium">
        Sorteringsrekkefølge
      </label>
      <input required id="template-sort" class="ds-input" type="number" bind:value={editableTemplate.draft.sort} />
    </ds-field>

    <div class="template-editor">
      <div class="template-availability-options">
        <fieldset class="ds-fieldset content-item">
          <legend class="ds-label" data-weight="medium">
            Tilgjengelig som
          </legend>
          <ds-field class="ds-field">
            <input class="ds-input" id="available-for-students" type="checkbox" bind:checked={editableTemplate.draft.availableForDocumentType.student} />
            <label class="ds-label" for="available-for-students">Elevnotat</label>
          </ds-field>
          <ds-field class="ds-field">
            <input class="ds-input" id="available-for-groups" type="checkbox" bind:checked={editableTemplate.draft.availableForDocumentType.group} />
            <label class="ds-label" for="available-for-groups">Klassenotat</label>
          </ds-field>
        </fieldset>
      </div>

      <div class="template-content">
        {#if editableTemplate.draft.content.length === 0}
          <p>Ingen elementer i malen enda</p>
        {/if}
        {#each editableTemplate.draft.content as _contentItem, index}
          <TemplateEditorItem bind:contentItem={editableTemplate.draft.content[index]} index={index} contentItemsLength={editableTemplate.draft.content.length} moveItem={toIndex => moveTemplateItem(index, toIndex)} removeItem={() => removeTemplateItem(index)} />
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
  {#each editableTemplate.draft.content as contentItem, index}
    <DocumentContentItemComponent editMode={true} previewMode={true} {index} {contentItem} />
  {/each}
</div>

<hr aria-hidden="true" class="ds-divider"/>

<div class="template-actions">
  {#if previewMode}
    <button class="ds-button" data-variant="secondary" type="button" onclick={() => previewMode = false}><span class="material-symbols-outlined">edit</span>Rediger mal</button>
  {:else}
    {#if !editableTemplate.draft._id}
      <AsyncButton buttonText="Lagre mal" onClick={newTemplate} iconName="save" />
    {:else}
      <AsyncButton disabled={!editableTemplate.isDirty} buttonText="Lagre endringer" onClick={updateTemplate} iconName="save" />
    {/if}
    <button class="ds-button" data-variant="secondary" type="button" onclick={() => previewMode = true}><span class="material-symbols-outlined">visibility</span>Forhåndsvis mal</button>
  {/if}
  <a href="/system/templates" class="ds-button" data-variant="secondary"><span class="material-symbols-outlined">arrow_back</span>Tilbake til maler</a>
  {#if editableTemplate.draft._id}
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
    margin: 1rem 0;
  }

  .template-editor-actions {
    margin: 1rem 0;
  }
  .template-editor-actions-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .template-actions {
    padding: 1rem 0;
    display: flex;
    gap: 0.5rem;
  }
  .template-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>