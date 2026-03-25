<script lang="ts">
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()
</script>

<div class="page-content">
  <h1 class="ds-heading" data-size="lg">Skoleadministrasjon</h1>
    
  {#each data.accessSchools as school}
    <div class="ds-card" data-variant="default" data-color="neutral">
      <div class="ds-card__block">
        <h2 class="ds-heading">
          <a class="ds-link" href={`/schooladministration/${school.schoolNumber}`}>{school.name}</a>
        </h2>
      </div>
    </div>
  {/each}
</div>

<style>
  .ds-card {
    margin: var(--ds-size-4) 0;
  }
</style>
