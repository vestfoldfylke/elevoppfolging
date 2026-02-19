<script lang="ts">
  import type { DocumentContentItem, DocumentInputItem } from "$lib/types/db/shared-types"

  type ItemProps = {
    index: number
    editMode: boolean
    contentItem: DocumentContentItem
  }

  let { editMode, contentItem = $bindable(), index }: ItemProps = $props()
</script>

{#snippet helpText(inputItem: DocumentInputItem)}
  {#if inputItem.helpText}
    <div class="help-text">
      {inputItem.helpText}
    </div>
  {/if}
{/snippet}

{#if contentItem.type === "h1"}
  <h1>{contentItem.value}</h1>
{/if}

{#if contentItem.type === "p"}
  <p>{contentItem.value}</p>
{/if}

{#if contentItem.type === "inputText"}
  <div class="document-content-item">
    {@render helpText(contentItem)}
    <label for={contentItem.label}>{contentItem.label}</label>
    <input disabled={!editMode} type="text" id={contentItem.label} name="contentItem-{index}" placeholder={contentItem.placeholder} bind:value={contentItem.value} required={contentItem.required} />
  </div>
{/if}

{#if contentItem.type === "textarea"}
  <div class="document-content-item">
    {@render helpText(contentItem)}
    <label for={contentItem.label}>{contentItem.label}</label>
    <textarea disabled={!editMode} id={contentItem.label} name="contentItem-{index}" rows={contentItem.initialRows} placeholder={contentItem.placeholder} required={contentItem.required} bind:value={contentItem.value}></textarea>
  </div>
{/if}

<style>
  .document-content-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .help-text {
    background-color: pink;
    padding: 0.25rem;
    border: 5px dotted red;
  }
</style>