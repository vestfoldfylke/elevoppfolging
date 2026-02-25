<script lang="ts">
  import type { DocumentContentItem, DocumentInputItem } from "$lib/types/db/shared-types"

  type ItemProps = {
    index: number
    editMode: boolean
    previewMode?: boolean
    contentItem: DocumentContentItem
  }

  let { editMode, previewMode = false, contentItem = $bindable(), index }: ItemProps = $props()
</script>

{#snippet helpText(inputItem: DocumentInputItem)}
  {#if inputItem.helpText}
    <div class="help-text">
      {inputItem.helpText}
    </div>
  {/if}
{/snippet}

{#if contentItem.type === "header"}
  <div class="document-content-item-header">{contentItem.value}</div>
{/if}

{#if contentItem.type === "paragraph"}
  <pre class="paragraph">{contentItem.value}</pre>
{/if}

{#if contentItem.type === "inputText"}
  <div class="document-content-item">
    {@render helpText(contentItem)}
    <label for={contentItem.label}>{contentItem.label}<span class="required-indicator">{contentItem.required ? "*" : ""}</span></label>
    {#if previewMode}
      <input disabled={!editMode} type="text" id={contentItem.label} name="contentItem-{index}" placeholder={contentItem.placeholder} value={contentItem.value} required={contentItem.required} />
    {:else}
      <input disabled={!editMode} type="text" id={contentItem.label} name="contentItem-{index}" placeholder={contentItem.placeholder} bind:value={contentItem.value} required={contentItem.required} />
    {/if}
  </div>
{/if}

{#if contentItem.type === "textarea"}
  <div class="document-content-item">
    {@render helpText(contentItem)}
    <label for={contentItem.label}>{contentItem.label}<span class="required-indicator">{contentItem.required ? "*" : ""}</span></label>
    {#if previewMode}
      <textarea disabled={!editMode} id={contentItem.label} name="contentItem-{index}" rows={contentItem.initialRows} placeholder={contentItem.placeholder} required={contentItem.required}>{contentItem.value}</textarea>
    {:else}
      <textarea disabled={!editMode} id={contentItem.label} name="contentItem-{index}" rows={contentItem.initialRows} placeholder={contentItem.placeholder} required={contentItem.required} bind:value={contentItem.value}></textarea>
    {/if}
  </div>
{/if}

{#if contentItem.type === "radioGroup"}
  <div class="document-content-item">
    {@render helpText(contentItem)}
    <div class="label">{contentItem.header}<span class="required-indicator">{contentItem.required ? "*" : ""}</span></div>
    <div class="radio-group-options">
      {#each contentItem.items as item, itemIndex}
        <label>
          {#if previewMode}
            <input disabled={!editMode} type="radio" id={`contentItem-${index}-radio-${itemIndex}`} name={`contentItem-${index}`} value={item.value} required={contentItem.required} checked={contentItem.selectedValue === item.value} />
          {:else}
             <input disabled={!editMode} type="radio" id={`contentItem-${index}-radio-${itemIndex}`} name={`contentItem-${index}`} bind:group={contentItem.selectedValue} value={item.value} required={contentItem.required} />
          {/if}
          {item.label}
        </label>
      {/each}
    </div>
  </div>
{/if}

<style>
  .document-content-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin: 1rem 0rem;
  }

  .document-content-item-header {
    font-weight: bold;
    font-size: 1.1rem;
    margin: 1rem 0rem;
  }

  .paragraph {
    font: inherit;
    white-space: pre-wrap;
  }

  .radio-group-options {
    display: flex;
    gap: 0.5rem;
  }

  .help-text {
    background-color: var(--color-warning-20);
    padding: 0.25rem;
  }
</style>