<script lang="ts">
  import TemplateEditor from "$lib/components/TemplateEditor.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let showTemplateEditor = $state(false)
</script>

<h1>Notatmaler</h1>
<p>Lag deg en notat-type da</p>

<button onclick={() => showTemplateEditor = !showTemplateEditor}>
  {#if showTemplateEditor}
    Lukk notat-type-editor
  {:else}
    Åpne notat-type-editor
  {/if}
</button>

{#if showTemplateEditor}
  <TemplateEditor />
{/if}

{#each data.templates as template}
  <div class="template">
    <h2>{template.name}</h2>
  </div>
{/each}

<style>

</style>
