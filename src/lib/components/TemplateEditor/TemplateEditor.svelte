<script lang="ts">
  import { enhance } from "$app/forms"
  import { page } from "$app/state"
  import type { DocumentContentItem, DocumentContentTemplate } from "$lib/types/db/shared-types"
  import type { ActionData } from "../../../routes/admin/templates/$types"
  import DocumentContent from "../Document/DocumentContent.svelte"
  import TemplateEditorItem from "./TemplateEditorItem.svelte"

  type TemplateEditorProps = {
    initialTemplate?: DocumentContentTemplate
  }

  const newTemplate: DocumentContentTemplate = {
    _id: "",
    version: 1,
    name: "Ny notat-type",
    availableForDocumentType: {
      student: true,
      group: false
    },
    created: {
      at: new Date().toISOString(),
      by: {
        entraUserId: "nei",
        fallbackName: "nei"
      }
    },
    modified: {
      at: new Date().toISOString(),
      by: {
        entraUserId: "nei",
        fallbackName: "nei"
      }
    },
    content: []
  }

  let { initialTemplate = newTemplate }: TemplateEditorProps = $props()

  // svelte-ignore state_referenced_locally (JEG VIL DET!)
  let currentTemplate: DocumentContentTemplate = $state(JSON.parse(JSON.stringify(initialTemplate)))

  let previewMode = $state(false)

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
    <div class="template-editor">
      <div class="template-metadata">
        <div>
          <label for="template-name">Notat-type navn</label>
          <input id="template-name" type="text" bind:value={currentTemplate.name} />
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
        {#each currentTemplate.content as contentItem, index (index)}
          <TemplateEditorItem bind:contentItem={currentTemplate.content[index]} index={index} displayName={getDisplayNameForContentItem(contentItem.type)} contentItemsLength={currentTemplate.content.length} moveItem={(toIndex: number) => moveTemplateItem(index, toIndex)} removeItem={() => removeTemplateItem(index)} />
        {/each}
      </div>
    </div>

    <div class="template-editor-actions">
      <button onclick={() => addTemplateItem("h1")}><span class="material-symbols-outlined">add</span>Overskrift</button>
      <button onclick={() => addTemplateItem("p")}><span class="material-symbols-outlined">add</span>Tekstavsnitt</button>
      <button onclick={() => addTemplateItem("inputText")}><span class="material-symbols-outlined">add</span>Inputfelt</button>
      <button onclick={() => addTemplateItem("textarea")}><span class="material-symbols-outlined">add</span>Tekstområde</button>
    </div>
  {/if}

  {#if previewMode}
    <div class="template-preview">
      <DocumentContent editMode={true} form={null} content={currentTemplate.content} />
    </div>
  {/if}
</div>

<div class="template-actions">
  <button onclick={() => previewMode = !previewMode}>{previewMode ? "Rediger mal" : "Forhåndsvisning"}</button>
  <form method="POST" action={page.url.pathname === "/admin/templates" ? "?/newDocumentContentTemplateAction" : "?/updateDocumentContentTemplateAction"} use:enhance={() => {
    return async ({ result, update }) => {
      if (result.type === "success") {
        alert("Mal lagret! og redirect ellerno fett")
        await update()
      }
      if (result.type === "failure") {
        alert("Noe gikk galt ved lagring av malen, prøv igjen senere")
        // const failureResult = result.data as ActionData // If we need it
      }
    }
  }}>
    <input type="hidden" name="templateData" value={JSON.stringify(currentTemplate)} />
    <button>Lagre mal</button>
  </form>
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
  .template-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
</style>