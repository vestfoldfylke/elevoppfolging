<script lang="ts">
  import type { DSSuggestionElement } from "@digdir/designsystemet-web";

  type SearchSelectProps = {
    label: string
    items: {
      label: string
      value: string
    }[]
    value: string
  }

  let { label, items, value = $bindable() }: SearchSelectProps = $props()

  const id = `search-select-${crypto.randomUUID()}`

  let suggestionElement: DSSuggestionElement | undefined = $state()
  
  let searchValue: string = $state("")

  const optionsToShow = $derived.by(() => {
    if (!searchValue) {
      return items.slice(0, 20)
    }

    return items.filter((item) => item.label.toLowerCase().includes(searchValue.toLowerCase())).slice(0, 20)
  })

  const oncomboboxafterselect = (): void => {
    if (!suggestionElement) {
      throw new Error("Suggestion element not found, can't do much")
    }

    const selectedValues = suggestionElement.values
    if (selectedValues.length > 0) {
      value = selectedValues[0]
    }
  }

</script>

<ds-field class="ds-field content-item">
  <label for="{id}" class="ds-label" data-weight="medium">{label}</label>

  <ds-suggestion bind:this={suggestionElement} data-nofilter class="ds-suggestion" /* @ts-expect-error (oncomboboxafterselect exists and works...) */ oncomboboxafterselect={oncomboboxafterselect}>
    <input id="{id}" class="ds-input" type="text" placeholder="" bind:value={searchValue} />
    
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions (handled by the ds-suggestion element) - have clickevent as oncomboboxafterselect does not trigger on del -->
    <del onclick={() => { searchValue = ""; value = ""; }} aria-label="Tøm" hidden=""></del>
    
    <u-datalist>
      {#each optionsToShow as option}
        <u-option value={option.value}>
          {option.label}
        </u-option>
      {/each}

      {#if optionsToShow.length < items.length}
        <u-option value="">
          Og {items.length - optionsToShow.length} flere... Søk for å vise flere resultater
        </u-option>
      {/if}
    </u-datalist>
  </ds-suggestion>
</ds-field>