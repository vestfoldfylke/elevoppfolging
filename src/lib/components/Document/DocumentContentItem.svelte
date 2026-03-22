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
    <div data-field="description">
      {inputItem.helpText}
    </div>
  {/if}
{/snippet}

{#snippet requiredIndicator(inputItem: DocumentInputItem)}
  {#if "required" in inputItem && inputItem.required}
    <span class="ds-tag" data-variant="outline" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
  {:else}
    <span class="ds-tag" data-variant="outline" data-color="subtle" style="margin-inline-start:var(--ds-size-2)">Valgfritt</span>
  {/if}
{/snippet}

{#if contentItem.type === "header"}
  <p class="ds-heading content-item">{contentItem.value}</p>
{/if}

{#if contentItem.type === "paragraph"}
  <p class="ds-paragraph content-item paragraph-item">{contentItem.value}</p>
{/if}

{#if contentItem.type === "inputText"}
  <ds-field class="ds-field content-item">
    <label for={contentItem.label} class="ds-label" data-weight="medium">
      {contentItem.label}
      {@render requiredIndicator(contentItem)}
    </label>
    {@render helpText(contentItem)}
    {#if previewMode}
      <input autocomplete="off" class="ds-input" type="text" id={contentItem.label} name={`contentItem-${index}`} placeholder={contentItem.placeholder} value={contentItem.value} />
    {:else}
      <input autocomplete="off" class="ds-input" type="text" id={contentItem.label} name={`contentItem-${index}`} placeholder={contentItem.placeholder} bind:value={contentItem.value} required={contentItem.required} disabled={!editMode} />
    {/if}
  </ds-field>
{/if}

{#if contentItem.type === "textarea"}
  <ds-field class="ds-field content-item">
    <label class="ds-label" data-weight="medium" for={contentItem.label}>
      {contentItem.label}
      {@render requiredIndicator(contentItem)}
    </label>
    {@render helpText(contentItem)}
    {#if previewMode}
      <textarea class="ds-input" id={contentItem.label} name="contentItem-{index}" rows={contentItem.initialRows} placeholder={contentItem.placeholder}>{contentItem.value}</textarea>
    {:else}
      <textarea class="ds-input" id={contentItem.label} name="contentItem-{index}" rows={contentItem.initialRows} placeholder={contentItem.placeholder} required={contentItem.required} bind:value={contentItem.value} disabled={!editMode}></textarea>
    {/if}
  </ds-field>
{/if}

{#if contentItem.type === "radioGroup"}
  <fieldset class="ds-fieldset content-item">
    <legend class="ds-label" data-weight="medium">
      {contentItem.header}
      <span class="ds-tag" data-variant="outline" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
    </legend>
    {@render helpText(contentItem)}
    <!--<p class="ds-paragraph" data-variant="default">Trondheim is divided into four districts</p>-->
    {#each contentItem.items as item, itemIndex}
      <ds-field class="ds-field">
        {#if previewMode}
          <input class="ds-input" type="radio" id={`contentItem-${index}-radio-${itemIndex}`} name={`contentItem-${index}`} value={item.value} checked={contentItem.selectedValue === item.value} />
        {:else}
          <input class="ds-input" disabled={!editMode} type="radio" id={`contentItem-${index}-radio-${itemIndex}`} name={`contentItem-${index}`} bind:group={contentItem.selectedValue} value={item.value} required={true} />
        {/if}
        <label class="ds-label" data-weight="regular" for={`contentItem-${index}-radio-${itemIndex}`}>{item.label}</label>
      </ds-field>
    {/each}
  </fieldset>
{/if}

{#if contentItem.type === "checkboxGroup"}
  <fieldset class="ds-fieldset content-item">
    <legend class="ds-label" data-weight="medium">
      {contentItem.header}
      <span class="ds-tag" data-variant="outline" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Minst et valg</span>
    </legend>
    {@render helpText(contentItem)}
    {#each contentItem.items as item, itemIndex}
      <ds-field class="ds-field">
        {#if previewMode}
          <input class="ds-input" type="checkbox" id={`contentItem-${index}-checkbox-${itemIndex}`} name={`contentItem-${index}-checkbox-${itemIndex}`} value={item.value} />
        {:else}
          <input class="ds-input" disabled={!editMode} type="checkbox" id={`contentItem-${index}-checkbox-${itemIndex}`} name={`contentItem-${index}-checkbox-${itemIndex}`} value={item.value} bind:group={contentItem.selectedValues} required={true} />
        {/if}
        <label class="ds-label" data-weight="regular" for={`contentItem-${index}-checkbox-${itemIndex}`}>{item.label}</label>
      </ds-field>
    {/each}
  </fieldset>
{/if}

<style>
  .paragraph-item {
    white-space: pre-wrap;
  }
</style>