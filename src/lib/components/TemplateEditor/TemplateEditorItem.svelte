<script lang="ts">
  import type { DocumentContentItem } from "$lib/types/db/shared-types"
  import DocumentContentItemComponent from "../Document/DocumentContentItem.svelte"

  type TemplateEditorElementProps = {
    index: number
    contentItem: DocumentContentItem
    contentItemsLength: number
    moveItem: (toIndex: number) => void
    removeItem: () => void
  }

  let { index, contentItem = $bindable(), contentItemsLength, moveItem, removeItem }: TemplateEditorElementProps = $props()
</script>

<!--
- Skal kunne legge til elementer og fjerne, og endre rekkefølge på elementer
- Skal kunne lagre maler - det kommer sikkert til å ligge på +page (for der har vi form server
-->

<div class="template-content-item-container">
  <div class="template-content-item">
    <DocumentContentItemComponent index={index} {contentItem} editMode={false} />

    <div class="content-item-editor">
      {#if contentItem.type === "h1"}
        <input required id="h1-{index}" class="h1" type="text" bind:value={contentItem.value} />
      {/if}

      {#if contentItem.type === "p"}
        <textarea id="p-{index}" bind:value={contentItem.value}></textarea>
      {/if}

      {#if contentItem.type === "inputText"}
        <label for="inputText-helpText-{index}">Informasjonstekst (valgfri)</label>
        <input id="inputText-helpText-{index}" type="text" bind:value={contentItem.helpText} />

        <label for="inputText-label-{index}">Etikett</label>
        <input required id="inputText-label-{index}" type="text" bind:value={contentItem.label} />

        <label for="inputText-placeholder-{index}">Eksempeltekst (valgfri)</label>
        <input required id="inputText-placeholder-{index}" type="text" bind:value={contentItem.placeholder} />

        <label for="inputText-value-{index}">Standardverdi (valgfri)</label>
        <input id="inputText-value-{index}" type="text" bind:value={contentItem.value} />

        <label for="inputText-required-{index}">Obligatorisk</label>
        <input id="inputText-required-{index}" type="checkbox" bind:checked={contentItem.required} />
      {/if}       
      
      {#if contentItem.type === "textarea"}
        <label for="textarea-helpText-{index}">Informasjonstekst (valgfri)</label>
        <input id="textarea-helpText-{index}" type="text" bind:value={contentItem.helpText} />

        <label for="textarea-label-{index}">Etikett</label>
        <input required id="textarea-label-{index}" type="text" bind:value={contentItem.label} />

        <label for="textarea-placeholder-{index}">Eksempeltekst (valgfri)</label>
        <input required id="textarea-placeholder-{index}" type="text" bind:value={contentItem.placeholder} />

        <label for="textarea-value-{index}">Standardverdi (valgfri)</label>
        <input id="textarea-value-{index}" type="text" bind:value={contentItem.value} />

        <label for="textarea-initialRows-{index}">Antall rader</label>
        <input id="textarea-initialRows-{index}" type="number" bind:value={contentItem.initialRows} />

        <label for="textarea-required-{index}">Obligatorisk</label>
        <input id="textarea-required-{index}" type="checkbox" bind:checked={contentItem.required} />
      {/if}
    </div>
  </div>

  <div class="template-content-item-actions">
    <button type="button" disabled={index === 0} onclick={() => {
      moveItem(index - 1)
    }}>Flytt opp</button>
    <button type="button" disabled={index === contentItemsLength - 1} onclick={() => {
      moveItem(index + 1)
    }}>Flytt ned</button>
    <button type="button" onclick={() => removeItem()}>Fjern</button>
  </div>
</div>

<style>
  .template-content-item-container {
    display: flex;
    flex-direction: column;
    border: 1px solid black;
    gap: 1rem;
    margin-bottom: 0.5rem;
    background-color: white;
  }
  .template-content-item {
    flex: 1;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
  }
  .template-content-item-actions {
    display: flex;
    justify-content: center;
  }
  .content-item-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
    border-top: 1px solid black;
    padding-top: 0.5rem;
  }
</style>