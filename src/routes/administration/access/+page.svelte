<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()
</script>

<div class="page-content">
  <PageHeader title="Tilgangsstyring" />

  <h2>Skoler</h2>

  {#each data.accessSchools as school}
    <div class="school">
      <a href={`/administration/access/${school.schoolNumber}`}><h3>{school.name}</h3></a>
    </div>
  {/each}
</div>

<style>
</style>
