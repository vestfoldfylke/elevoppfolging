<script lang="ts">
  import type { DocumentContentItem, DocumentInputItem } from "$lib/types/db/shared-types"

  type ItemProps = {
    index: number
    editMode: boolean
    previewMode?: boolean
    contentItem: DocumentContentItem
  }

  let { editMode, previewMode = false, contentItem = $bindable(), index }: ItemProps = $props()

  let checkboxes = $state<HTMLInputElement[]>([])

  // Custom validation of checkboxes
  $effect(() => {
    if (contentItem.type === "checkboxGroup" && editMode && checkboxes.length > 0) {
      contentItem.selectedValues // Trigger reactivity on selectedValues to ensure validation runs when they change

      const atLeastOneChecked = checkboxes.some((checkbox) => checkbox.checked)
      if (!atLeastOneChecked) {
        checkboxes[0].setCustomValidity("Velg minst ett alternativ")
      } else {
        checkboxes[0].setCustomValidity("") // Ok, will not trigger validation error
      }
    }
  })
</script>

{#snippet helpText(inputItem: DocumentInputItem)}
  {#if inputItem.helpText}
    <div data-field="description">
      {inputItem.helpText}
    </div>
  {/if}
{/snippet}

{#snippet requiredIndicator(required: boolean, requiredMessage: string = "Må fylles ut")}
  {#if editMode}
    {#if required}
      <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">{requiredMessage}</span>
    {:else}
      <span class="ds-tag" data-variant="outline" data-size="sm" data-color="subtle" style="margin-inline-start:var(--ds-size-2)">Valgfritt</span>
    {/if}
  {/if}
{/snippet}

{#if contentItem.type === "header"}
  <p class="ds-heading content-item">{contentItem.value}</p>
{/if}

{#if contentItem.type === "paragraph"}
  <p class="ds-paragraph content-item pre-wrap-whitespace">{contentItem.value}</p>
{/if}

{#if contentItem.type === "inputText"}
  {#if editMode}
    <ds-field class="ds-field content-item">
      <label for={contentItem.label} class="ds-label" data-weight="medium">
        {contentItem.label}
        {@render requiredIndicator(contentItem.required)}
      </label>
      {@render helpText(contentItem)}
      {#if previewMode}
        <input autocomplete="off" class="ds-input" type="text" id={contentItem.label} name={`preview-contentItem-${index}`} placeholder={contentItem.placeholder} value={contentItem.value} />
      {:else}
        <input autocomplete="off" class="ds-input" type="text" id={contentItem.label} name={`contentItem-${index}`} placeholder={contentItem.placeholder} bind:value={contentItem.value} required={contentItem.required} />
      {/if}
    </ds-field>
  {:else}
    <div class="ds-field content-item">
    <div class="ds-label" data-weight="medium">{contentItem.label}</div>
    {@render helpText(contentItem)}
    <p class="ds-paragraph">{contentItem.value}</p>
    </div>
  {/if}
{/if}

{#if contentItem.type === "textarea"}
  {#if editMode}
    <ds-field class="ds-field content-item">
      <label class="ds-label" data-weight="medium" for={contentItem.label}>
        {contentItem.label}
        {@render requiredIndicator(contentItem.required)}
      </label>
      {@render helpText(contentItem)}
      {#if previewMode}
        <textarea class="ds-input" id={contentItem.label} name={`preview-contentItem-${index}`} rows={contentItem.initialRows} placeholder={contentItem.placeholder}>{contentItem.value}</textarea>
      {:else}
        <textarea class="ds-input" id={contentItem.label} name="contentItem-{index}" rows={contentItem.initialRows} placeholder={contentItem.placeholder} required={contentItem.required} bind:value={contentItem.value}></textarea>
      {/if}
    </ds-field>
  {:else}
    <div class="ds-field content-item">
      <div class="ds-label" data-weight="medium">{contentItem.label}</div>
      {@render helpText(contentItem)}
      <p class="ds-paragraph pre-wrap-whitespace">{contentItem.value}</p>
    </div>
  {/if}
{/if}

{#if contentItem.type === "radioGroup"}
  <fieldset class="ds-fieldset content-item">
    <legend class="ds-label" data-weight="medium">
      {contentItem.header}
      {@render requiredIndicator(true, "Velg ett alternativ")}
    </legend>
    {@render helpText(contentItem)}
    {#each contentItem.items as item, itemIndex}
      <ds-field class="ds-field">
        {#if previewMode}
          <input class="ds-input" type="radio" id={`contentItem-${index}-radio-${itemIndex}`} name={`preview-contentItem-${index}`} value={item.value} checked={contentItem.selectedValue === item.value} />
        {:else if editMode}
          <input class="ds-input" type="radio" id={`contentItem-${index}-radio-${itemIndex}`} name={`contentItem-${index}`} bind:group={contentItem.selectedValue} value={item.value} required={true} />
        {:else}
          <input class="ds-input" type="radio" checked={contentItem.selectedValue === item.value} disabled={true} style={contentItem.selectedValue === item.value ? "opacity: 1;" : ""} />
        {/if}
        <label class="ds-label" data-weight="regular" for={`contentItem-${index}-radio-${itemIndex}`} style={!editMode && contentItem.selectedValue === item.value ? "opacity: 1;" : ""} >{item.label}</label>
      </ds-field>
    {/each}
  </fieldset>
{/if}

{#if contentItem.type === "checkboxGroup"}
  <fieldset class="ds-fieldset content-item">
    <legend class="ds-label" data-weight="medium">
      {contentItem.header}
      {@render requiredIndicator(true, "Minst et valg")}
    </legend>
    {@render helpText(contentItem)}
    {#each contentItem.items as item, itemIndex}
      <ds-field class="ds-field">
        {#if previewMode}
          <input class="ds-input" type="checkbox" id={`contentItem-${index}-checkbox-${itemIndex}`} name={`preview-contentItem-${index}-checkbox`} value={item.value} />
        {:else if editMode}
          <input class="ds-input" disabled={!editMode} type="checkbox" id={`contentItem-${index}-checkbox-${itemIndex}`} name={`prevcontentItem-${index}-checkbox`} value={item.value} bind:group={contentItem.selectedValues} bind:this={checkboxes[itemIndex]} />
        {:else}
          <input class="ds-input" type="checkbox" checked={contentItem.selectedValues?.includes(item.value)} disabled={true} style={contentItem.selectedValues?.includes(item.value) ? "opacity: 1;" : ""} />
        {/if}
        <label class="ds-label" data-weight="regular" for={`contentItem-${index}-checkbox-${itemIndex}`} style={!editMode && contentItem.selectedValues?.includes(item.value) ? "opacity: 1;" : ""}>{item.label}</label>
      </ds-field>
    {/each}
  </fieldset>
{/if}

<style>
  .pre-wrap-whitespace {
    white-space: pre-wrap;
  }
</style>