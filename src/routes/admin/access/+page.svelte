<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()
</script>

<PageHeader title="Führer-tilgang" />

<h2>List opp eksisterende tilganger her</h2>

{#each data.schoolLeaderAccess as schoolLeaderAccess}
  <div>
    <p>Skole: {schoolLeaderAccess.schools.map(school => school.schoolNumber).join(", ")}</p>
  </div>
{/each}

<h2>Legg til ny skoleledertilgang</h2>
{#each data.appUsers as appUser}
  <div>
    <p>Bruker: {appUser.entra.displayName}</p>
  </div>
{/each}


<style>
</style>
