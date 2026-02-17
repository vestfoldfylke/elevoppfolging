<script lang="ts">
  import type { DocumentContentItem, DocumentContentTemplate } from "$lib/types/db/shared-types"
  import DocumentContent from "../Document/DocumentContent.svelte"
  import TemplateEditorItem from "./TemplateEditorItem.svelte"

  type TemplateEditorProps = {
    currentTemplate: DocumentContentTemplate
    validateTemplate: () => boolean
  }

  let { currentTemplate = $bindable(), validateTemplate = $bindable() }: TemplateEditorProps = $props()

  let previewMode = $state(false)

  let templateForm: HTMLFormElement | undefined = $state()

  validateTemplate = () => {
    if (!templateForm) {
      throw new Error("Template form not found")      
    }
    return templateForm.reportValidity()
  }

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
    currentTemplate.content.push(JSON.parse(JSON.stringify(newItem)))
  }

  const getDisplayNameForContentItem = (contentItemType: string) => {
    const templateItem = templateItems.find((item) => item.type === contentItemType)
    return templateItem ? templateItem.displayName : ""
  }

  const moveTemplateItem = (currentIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= currentTemplate.content.length || currentIndex === toIndex) {
      return
    }
    const itemToMove = currentTemplate.content[currentIndex]
    currentTemplate.content.splice(currentIndex, 1)
    currentTemplate.content.splice(toIndex, 0, itemToMove)
  }

  const removeTemplateItem = (index: number) => {
    currentTemplate.content.splice(index, 1)
  }

</script>

<!--
- Skal kunne legge til elementer og fjerne, og endre rekkefølge på elementer
- Skal kunne lagre maler - det kommer sikkert til å ligge på +page (for der har vi form server
-->

<div class="template-editor-container">
  {#if !previewMode}
    <form bind:this={templateForm}>
      <div class="template-editor">
        <div class="template-metadata">
          <div>
            <label for="template-name">Notat-type navn</label>
            <input required id="template-name" type="text" bind:value={currentTemplate.name} />
          </div>
          <div>
            <label for="available-for-students">Elevnotat</label>
            <input id="available-for-students" type="checkbox" bind:checked={currentTemplate.availableForDocumentType.student} />
          </div>
          <div>
            <label for="available-for-groups">Gruppe-notat</label>
            <input id="available-for-groups" type="checkbox" bind:checked={currentTemplate.availableForDocumentType.group} />
          </div>
        </div>

        <div class="template-content">
          {#if currentTemplate.content.length === 0}
            <p>Ingen elementer i malen enda</p>
          {/if}
          {#each currentTemplate.content as _contentItem, index}
            <TemplateEditorItem bind:contentItem={currentTemplate.content[index]} index={index} contentItemsLength={currentTemplate.content.length} moveItem={(toIndex: number) => moveTemplateItem(index, toIndex)} removeItem={() => removeTemplateItem(index)} />
          {/each}
        </div>
      </div>
    </form>

    <div class="template-editor-actions">
      {#each templateItems as templateItem}
        <button type="button" onclick={() => addTemplateItem(templateItem.type)}><span class="material-symbols-outlined">add</span>{templateItem.displayName}</button>
      {/each}
    </div>
  {/if}
</div>


<style>
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