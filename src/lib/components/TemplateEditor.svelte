<script lang="ts">
  import { applyAction, enhance } from "$app/forms"
  import type { DocumentContentItem, DocumentContentTemplate } from "$lib/types/db/shared-types"
  import type { ActionData } from "../../routes/admin/templates/$types"
  import DocumentContent from "./Document/DocumentContent.svelte"

  type TemplateEditorProps = {
    initialTemplate?: DocumentContentTemplate
  }

  const newTemplate: DocumentContentTemplate = {
    _id: "",
    version: 1,
    name: "Ny notat-type",
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
  let currentTemplate = $state(JSON.parse(JSON.stringify(initialTemplate)))

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
</script>

<!--
- Skal kunne legge til elementer og fjerne, og endre rekkefølge på elementer
- Skal kunne lagre maler - det kommer sikkert til å ligge på +page (for der har vi form server
-->

<div class="template-editor-container">
  <div class="template-editor">
    <div class="template-metadata">
      <label for="template-name">Notat-type</label>
      <input id="template-name" type="text" bind:value={currentTemplate.name} />
    </div>

    <div class="template-editor-actions">
      <button onclick={() => addTemplateItem("h1")}>Ny h1</button>
      <button onclick={() => addTemplateItem("p")}>Ny p</button>
      <button onclick={() => addTemplateItem("inputText")}>Ny inputText</button>
      <button onclick={() => addTemplateItem("textarea")}>Ny textarea</button>
    </div>

    <div class="template-content">
      <h3>Elementer</h3>
      {#each currentTemplate.content as contentItem, index}
        <div class="template-content-item">
          <div class="template-content-item-header">
            <h3 class="template-content-item-title">{getDisplayNameForContentItem(contentItem.type)}</h3>
            <div class="template-content-item-actions">
              <button disabled={index === 0} onclick={() => {
                const temp = currentTemplate.content[index - 1]
                currentTemplate.content[index - 1] = currentTemplate.content[index]
                currentTemplate.content[index] = temp
              }}>Flytt opp</button>
              <button disabled={index === currentTemplate.content.length - 1} onclick={() => {
                const temp = currentTemplate.content[index + 1]
                currentTemplate.content[index + 1] = currentTemplate.content[index]
                currentTemplate.content[index] = temp
              }}>Flytt ned</button>
              <button onclick={() => currentTemplate.content.splice(index, 1)}>Fjern</button>
            </div>
          </div>

          {#if contentItem.type === "h1"}
            <input id="h1-{index}" class="h1" type="text" bind:value={contentItem.value} />
          {/if}

          {#if contentItem.type === "p"}
            <textarea id="p-{index}" bind:value={contentItem.value}></textarea>
          {/if}

          {#if contentItem.type === "inputText"}
            <label for="inputText-helpText-{index}">Informasjonstekst (valgfri)</label>
            <input id="inputText-helpText-{index}" type="text" bind:value={contentItem.helpText} />

            <label for="inputText-label-{index}">Etikett</label>
            <input id="inputText-label-{index}" type="text" bind:value={contentItem.label} />

            <label for="inputText-placeholder-{index}">Eksempeltekst (valgfri)</label>
            <input id="inputText-placeholder-{index}" type="text" bind:value={contentItem.placeholder} />

            <label for="inputText-value-{index}">Standardverdi (valgfri)</label>
            <input id="inputText-value-{index}" type="text" bind:value={contentItem.value} />

            <label for="inputText-required-{index}">Obligatorisk</label>
            <input id="inputText-required-{index}" type="checkbox" bind:checked={contentItem.required} />
          {/if}
          
          {#if contentItem.type === "textarea"}
            <label for="textarea-helpText-{index}">Informasjonstekst (valgfri)</label>
            <input id="textarea-helpText-{index}" type="text" bind:value={contentItem.helpText} />

            <label for="textarea-label-{index}">Etikett</label>
            <input id="textarea-label-{index}" type="text" bind:value={contentItem.label} />

            <label for="textarea-placeholder-{index}">Eksempeltekst (valgfri)</label>
            <input id="textarea-placeholder-{index}" type="text" bind:value={contentItem.placeholder} />

            <label for="textarea-value-{index}">Standardverdi (valgfri)</label>
            <input id="textarea-value-{index}" type="text" bind:value={contentItem.value} />

            <label for="textarea-initialRows-{index}">Antall rader</label>
            <input id="textarea-initialRows-{index}" type="number" bind:value={contentItem.initialRows} />

            <label for="textarea-required-{index}">Obligatorisk</label>
            <input id="textarea-required-{index}" type="checkbox" bind:checked={contentItem.required} />
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="template-preview">
    <h2>Forhåndsvisning</h2>
    <DocumentContent editMode={true} form={null} content={currentTemplate.content} />
  </div>
</div>

<div class="template-actions">
  <form method="POST" action="?/newDocumentContentTemplateAction" use:enhance={() => {
    return async ({ result, update }) => {
      if (result.type === "success") {
        alert("Mal lagret! og redirect ellerno fett")
        await update()
      }
      if (result.type === "failure") {
        alert("Noe gikk galt ved lagring av malen, prøv igjen senere")
        const failureResult = result.data as ActionData
        console.log(failureResult)
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
    gap: 2rem;
  }
  .template-editor {
    flex: 1;
  }
  .template-preview {
    border: 1px solid black;
    flex: 1;
  }

  .template-editor-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid black;
    padding: 1rem;
  }
  .template-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .template-content-item {
    display: flex;
    flex-direction: column;
    border: 1px solid black;
    padding: 1rem;
    margin-bottom: 1rem;
    background-color: #ccc;
  }
  .template-content-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .template-content-item-title {
    margin: 0;
  }

  .h1 {
    font-size: 1.5rem;
    font-weight: bold;
  }
</style>