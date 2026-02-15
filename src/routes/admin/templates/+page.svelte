<script lang="ts">
  import TemplateEditor from "$lib/components/TemplateEditor/TemplateEditor.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let showTemplateEditor = $state(false)
</script>

<h1>Notatmaler</h1>

{#if !showTemplateEditor}
  <button class="filled" onclick={() => showTemplateEditor = true}>Ny notat-mal</button>
{/if}

{#if showTemplateEditor}
  <TemplateEditor />
{/if}

{#if !showTemplateEditor}
  {#each data.templates as template}
    <div class="template">
      <a href={`/admin/templates/${template._id}`}>{template.name}</a>
    </div>
  {/each}
{/if}

<style>

</style>
