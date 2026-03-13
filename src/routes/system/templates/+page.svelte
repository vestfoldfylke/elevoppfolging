<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()
</script>

<PageHeader title="Notat-maler" />

<a href="/system/templates/new">Ny notat-mal</a>

<h2>Eksisterende maler</h2>
{#each data.templates as template}
  <div class="template">
    <a href={`/system/templates/${template._id}`}>{template.name}</a>
  </div>
{/each}

<style>
</style>
