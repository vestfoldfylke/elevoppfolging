<script lang="ts">
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

</script>

<h1>Notatmaler</h1>

<a href="/admin/templates/new">Ny notat-mal</a>

<h2>Eksisterende maler</h2>
{#each data.templates as template}
  <div class="template">
    <a href={`/admin/templates/${template._id}`}>{template.name}</a>
  </div>
{/each}

<style>
</style>
