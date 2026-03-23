<script lang="ts">
  import type { DocumentCheckboxGroupItem, DocumentContentItem, DocumentRadioGroupItem } from "$lib/types/db/shared-types"
  import DocumentContentItemComponent from "../Document/DocumentContentItem.svelte"
  import { templateEditorContentItemNames } from "./template-editor-constants"

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
      label: "Enda et valg",
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

  // Checkbox group functions
  const addCheckboxGroupOption = (checkboxGroup: DocumentCheckboxGroupItem) => {
    checkboxGroup.items.push({
      label: "Enda et valg",
      value: crypto.randomUUID()
    })
  }

  const removeCheckboxGroupOption = (checkboxGroup: DocumentCheckboxGroupItem, optionIndex: number) => {
    if (checkboxGroup.items.length <= 2) {
      alert("En valggruppe må ha minst to valg")
      return
    }
    checkboxGroup.items.splice(optionIndex, 1)
  }
</script>

<!--
- Skal kunne legge til elementer og fjerne, og endre rekkefølge på elementer
- Skal kunne lagre maler - det kommer sikkert til å ligge på +page (for der har vi form server
-->

<div
  class="ds-card"
  data-variant="tinted"
  data-color="accent"
  style="display:grid;grid-template-columns:1fr 1fr"
>
  <div class="ds-card__block">
    <h2 class="ds-heading" data-size="xs">{templateEditorContentItemNames[contentItem.type]}</h2>
    
    {#if contentItem.type === "header"}
      <input class="ds-input" required id="header-{index}" type="text" bind:value={contentItem.value} />
    {/if}

    {#if contentItem.type === "paragraph"}
      <textarea class="ds-input" rows="8" id="paragraph-{index}" bind:value={contentItem.value}></textarea>
    {/if}

    {#if contentItem.type === "inputText"}
      <ds-field class="ds-field">
        <input id="inputText-required-{index}" class="ds-input" type="checkbox" bind:checked={contentItem.required} />
        <label for="inputText-required-{index}" class="ds-label" data-weight="regular">Må fylles ut</label>
      </ds-field>

      <ds-field class="ds-field">
        <label for="inputText-label-{index}" class="ds-label" data-weight="medium">Beskrivelse</label>
        <input id="inputText-label-{index}" class="ds-input" type="text" bind:value={contentItem.label} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="inputText-helpText-{index}" class="ds-label" data-weight="medium">Informasjonstekst (valgfritt)</label>
        <input id="inputText-helpText-{index}" class="ds-input" type="text" bind:value={contentItem.helpText} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="inputText-placeholder-{index}" class="ds-label" data-weight="medium">Eksempeltekst (valgfritt)</label>
        <input id="inputText-placeholder-{index}" class="ds-input" type="text" bind:value={contentItem.placeholder} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="inputText-value-{index}" class="ds-label" data-weight="medium">Standardverdi (valgfritt)</label>
        <input id="inputText-value-{index}" class="ds-input" type="text" bind:value={contentItem.value} />
      </ds-field>
    {/if}
    
    {#if contentItem.type === "textarea"}
      <ds-field class="ds-field">
        <input id="textarea-required-{index}" class="ds-input" type="checkbox" bind:checked={contentItem.required} />
        <label for="textarea-required-{index}" class="ds-label" data-weight="regular">Må fylles ut</label>
      </ds-field>

      <ds-field class="ds-field">
        <label for="textarea-label-{index}" class="ds-label" data-weight="medium">Beskrivelse</label>
        <input id="textarea-label-{index}" class="ds-input" type="text" bind:value={contentItem.label} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="textarea-helpText-{index}" class="ds-label" data-weight="medium">Informasjonstekst (valgfritt)</label>
        <input id="textarea-helpText-{index}" class="ds-input" type="text" bind:value={contentItem.helpText} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="textarea-placeholder-{index}" class="ds-label" data-weight="medium">Eksempeltekst (valgfritt)</label>
        <input id="textarea-placeholder-{index}" class="ds-input" type="text" bind:value={contentItem.placeholder} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="textarea-value-{index}" class="ds-label" data-weight="medium">Standardverdi (valgfritt)</label>
        <input id="textarea-value-{index}" class="ds-input" type="text" bind:value={contentItem.value} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="textarea-initialRows-{index}" class="ds-label" data-weight="medium">Antall rader</label>
        <input id="textarea-initialRows-{index}" class="ds-input" type="number" bind:value={contentItem.initialRows} />
      </ds-field>
     {/if}

     {#if contentItem.type === "radioGroup"}
      <ds-field class="ds-field">
        <label for="radioGroup-label-{index}" class="ds-label" data-weight="medium">Beskrivelse</label>
        <input id="radioGroup-label-{index}" class="ds-input" type="text" bind:value={contentItem.header} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="radioGroup-helpText-{index}" class="ds-label" data-weight="medium">Informasjonstekst (valgfritt)</label>
        <input id="radioGroup-helpText-{index}" class="ds-input" type="text" bind:value={contentItem.helpText} />
      </ds-field>

      {#each contentItem.items as radioItem, radioIndex}
        <ds-field class="ds-field">
          <label for="radioGroup-{index}-itemLabel-{radioIndex}" class="ds-label" data-weight="medium">Valg {radioIndex + 1}</label>
          <div class="input-with-action">
            <input required id="radioGroup-{index}-itemLabel-{radioIndex}" class="ds-input" type="text" placeholder="Valg {radioIndex + 1}" bind:value={radioItem.label} />
            <button class="ds-button" data-variant="tertiary" type="button" onclick={() => removeRadioGroupOption(contentItem, radioIndex)}><span class="material-symbols-outlined">delete</span></button>
          </div>
        </ds-field>
      {/each}

      <div class="input-item-actions">
        <button class="ds-button" data-variant="secondary" data-size="sm" type="button" onclick={() => addRadioGroupOption(contentItem)}>
          <span class="material-symbols-outlined">add</span>
          Legg til valg
        </button>
      </div>
      <br />
    {/if}

    {#if contentItem.type === "checkboxGroup"}
      <ds-field class="ds-field">
        <label for="checkboxGroup-label-{index}" class="ds-label" data-weight="medium">Beskrivelse</label>
        <input id="checkboxGroup-label-{index}" class="ds-input" type="text" bind:value={contentItem.header} />
      </ds-field>

      <ds-field class="ds-field">
        <label for="checkboxGroup-helpText-{index}" class="ds-label" data-weight="medium">Informasjonstekst (valgfritt)</label>
        <input id="checkboxGroup-helpText-{index}" class="ds-input" type="text" bind:value={contentItem.helpText} />
      </ds-field>

      {#each contentItem.items as checkItem, checkIndex}
        <ds-field class="ds-field">
          <label for="checkboxGroup-{index}-itemLabel-{checkIndex}" class="ds-label" data-weight="medium">Valg {checkIndex + 1}</label>
          <div class="input-with-action">
            <input required id="checkboxGroup-{index}-itemLabel-{checkIndex}" class="ds-input" type="text" placeholder="Valg {checkIndex + 1}" bind:value={checkItem.label} />
            <button class="ds-button" data-variant="tertiary" type="button" onclick={() => removeCheckboxGroupOption(contentItem, checkIndex)}><span class="material-symbols-outlined">delete</span></button>
          </div>
        </ds-field>
      {/each}
      <div class="input-item-actions">
        <button class="ds-button" data-variant="secondary" data-size="sm" type="button" onclick={() => addCheckboxGroupOption(contentItem)}>
          <span class="material-symbols-outlined">add</span>
          Legg til valg
        </button>
      </div>
      <br />
    {/if}

    <div class="template-content-item-actions">
      <button class="ds-button" data-variant="secondary" type="button" disabled={index === 0} onclick={() => {
        moveItem(index - 1)
      }}><span class="material-symbols-outlined">arrow_upward</span>Flytt opp</button>
      <button class="ds-button" data-variant="secondary" type="button" disabled={index === contentItemsLength - 1} onclick={() => {
        moveItem(index + 1)
      }}><span class="material-symbols-outlined">arrow_downward</span>Flytt ned</button>
      <button class="ds-button" data-variant="secondary" type="button" onclick={() => removeItem()}><span class="material-symbols-outlined">delete</span>Fjern</button>
    </div>

  </div>

  <!-- Preview of item -->
  <div class="ds-card__block">
    <h2 class="ds-heading" data-size="xs">Forhåndsvisning</h2>
    <DocumentContentItemComponent index={index} {contentItem} editMode={true} previewMode={true} />
  </div>
</div>

<style>
  .input-with-action {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .template-content-item-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>