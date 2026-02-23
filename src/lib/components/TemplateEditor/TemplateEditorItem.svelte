<script lang="ts">
  import type { DocumentContentItem, DocumentRadioGroupItem } from "$lib/types/db/shared-types"
  import DocumentContentItemComponent from "../Document/DocumentContentItem.svelte"

  type TemplateEditorElementProps = {
    index: number
    contentItem: DocumentContentItem
    contentItemsLength: number
    moveItem: (toIndex: number) => void
    removeItem: () => void
  }

  let { index, contentItem = $bindable(), contentItemsLength, moveItem, removeItem }: TemplateEditorElementProps = $props()

  // Radio group functions
  const addRadioGroupOption = (radioGroup: DocumentRadioGroupItem) => {
    radioGroup.items.push({
      label: "",
      value: crypto.randomUUID()
    })
  }

  const removeRadioGroupOption = (radioGroup: DocumentRadioGroupItem, optionIndex: number) => {
    if (radioGroup.items.length <= 2) {
      alert("En valggruppe må ha minst to valg")
      return
    }
    radioGroup.items.splice(optionIndex, 1)
  }

</script>

<!--
- Skal kunne legge til elementer og fjerne, og endre rekkefølge på elementer
- Skal kunne lagre maler - det kommer sikkert til å ligge på +page (for der har vi form server
-->

<div class="template-content-item-container">
  <div class="template-content-item">
    <strong>Forhåndsvisning</strong>
    <div class="template-content-item-preview">
      <DocumentContentItemComponent index={index} {contentItem} editMode={false} />
    </div>

    <div class="content-item-editor">
      <strong>Rediger</strong>
      
      {#if contentItem.type === "header"}
        <input required id="header-{index}" class="header" type="text" bind:value={contentItem.value} />
      {/if}

      {#if contentItem.type === "paragraph"}
        <textarea rows="10" id="paragraph-{index}" bind:value={contentItem.value}></textarea>
      {/if}

      {#if contentItem.type === "inputText"}
        <div class="input-item checkbox">
          <label for="inputText-required-{index}">Obligatorisk</label>
          <input id="inputText-required-{index}" type="checkbox" bind:checked={contentItem.required} />
        </div>
        <div class="input-item">
          <label for="inputText-helpText-{index}">Informasjonstekst (valgfri)</label>
          <input id="inputText-helpText-{index}" type="text" bind:value={contentItem.helpText} />
        </div>
        <div class="input-item small">
          <label for="inputText-label-{index}">Etikett</label>
          <input required id="inputText-label-{index}" type="text" bind:value={contentItem.label} />
        </div>
        <div class="input-item small">
          <label for="inputText-placeholder-{index}">Eksempeltekst (valgfri)</label>
          <input id="inputText-placeholder-{index}" type="text" bind:value={contentItem.placeholder} />
        </div>
        <div class="input-item small">
          <label for="inputText-value-{index}">Standardverdi (valgfri)</label>
          <input id="inputText-value-{index}" type="text" bind:value={contentItem.value} />
        </div>
      {/if}       
      
      {#if contentItem.type === "textarea"}
        <div class="input-item checkbox">
          <label for="textarea-required-{index}">Obligatorisk</label>
          <input id="textarea-required-{index}" type="checkbox" bind:checked={contentItem.required} />
        </div>
        <div class="input-item">
          <label for="textarea-helpText-{index}">Informasjonstekst (valgfri)</label>
          <input id="textarea-helpText-{index}" type="text" bind:value={contentItem.helpText} />
        </div>
        <div class="input-item small">
          <label for="textarea-label-{index}">Etikett</label>
          <input required id="textarea-label-{index}" type="text" bind:value={contentItem.label} />
        </div>
        <div class="input-item small">
          <label for="textarea-placeholder-{index}">Eksempeltekst (valgfri)</label>
          <input id="textarea-placeholder-{index}" type="text" bind:value={contentItem.placeholder} />
        </div>
        <div class="input-item small">
          <label for="textarea-value-{index}">Standardverdi (valgfri)</label>
          <input id="textarea-value-{index}" type="text" bind:value={contentItem.value} />
        </div>
        <div class="input-item small">
          <label for="textarea-initialRows-{index}">Antall rader</label>
          <input id="textarea-initialRows-{index}" type="number" bind:value={contentItem.initialRows} />
        </div>
      {/if}

      {#if contentItem.type === "radioGroup"}
        <div class="input-item checkbox">
          <label for="radioGroup-required-{index}">Obligatorisk</label>
          <input id="radioGroup-required-{index}" type="checkbox" bind:checked={contentItem.required} />
        </div>
        <div class="input-item">
          <label for="radioGroup-helpText-{index}">Informasjonstekst (valgfri)</label>
          <input id="radioGroup-helpText-{index}" type="text" bind:value={contentItem.helpText} />
        </div>
        <div class="input-item small">
          <label for="radioGroup-label-{index}">Overskrift</label>
          <input required id="radioGroup-label-{index}" type="text" bind:value={contentItem.header} />
        </div>
        {#each contentItem.items as radioItem, radioIndex}
          <div class="input-item-container">
            <div class="input-item small">
              <label for="radioGroup-{index}-itemLabel-{radioIndex}">Valg {radioIndex + 1}</label>
              <input required id="radioGroup-{index}-itemLabel-{radioIndex}" type="text" placeholder="Valg {radioIndex + 1}" bind:value={radioItem.label} />
            </div>
            <button class="icon-button" type="button" onclick={() => removeRadioGroupOption(contentItem, radioIndex)}><span class="material-symbols-outlined">delete</span></button>
          </div>
          <div class="input-item small" style="">
            <label for="radioGroup-{index}-itemValue-{radioIndex}">Valg {radioIndex + 1} - Verdi</label>
            <input disabled required id="radioGroup-{index}-itemValue-{radioIndex}" type="text" bind:value={radioItem.value} />
          </div>
        {/each}
        <div class="input-item-actions">
          <button type="button" onclick={() => addRadioGroupOption(contentItem)}>Legg til valg</button>
        </div>
      {/if}
    </div>
  </div>

  <div class="template-content-item-actions">
    <button type="button" disabled={index === 0} onclick={() => {
      moveItem(index - 1)
    }}><span class="material-symbols-outlined">arrow_upward</span>Flytt opp</button>
    <button type="button" disabled={index === contentItemsLength - 1} onclick={() => {
      moveItem(index + 1)
    }}><span class="material-symbols-outlined">arrow_downward</span>Flytt ned</button>
    <button type="button" onclick={() => removeItem()}><span class="material-symbols-outlined">delete</span>Fjern</button>
  </div>
</div>

<style>
  .template-content-item-container {
    display: flex;
    flex-direction: column;
    border: 0px solid black;
    gap: 1rem;
    margin-bottom: 0.5rem;
    background-color: var(--color-primary-10);
    padding: 1rem;
  }
  .template-content-item {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .template-content-item-preview {
    background-color: white;
    padding: 1rem;
  }
  .input-item-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .input-item {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5rem;
  }
  .input-item.small > input {
    max-width: 20rem;
  }
  .input-item.checkbox {
    flex-direction: row;
    gap: 0.5rem;
  }
  .template-content-item-actions {
    display: flex;
    gap: 0.5rem;
  }
  .content-item-editor {
    display: flex;
    flex-direction: column;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }
</style>