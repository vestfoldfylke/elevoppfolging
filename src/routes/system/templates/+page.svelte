<script lang="ts">
    import { goto } from "$app/navigation";
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()
</script>

<div class="page-content">
  <h1 class="ds-heading" data-size="lg">Notat-maler</h1>

  <p class="ds-paragraph">
    Her kan du se og redigere notatmaler som kan brukes når du oppretter notater om elever og klasser.
    <br />
    Rekkefølgen på malene i denne listen er den samme som i nedtrekksmenyen når du oppretter et notat.
    <br />
    Endre rekkefølgen på malene ved å gå inn på hver enkelt mal og redigere sortering (beklager 😞).
  </p>

  <ol class="ds-list">
    {#each data.templates as template}
      <li>
        <a class="ds-link" href={`/system/templates/${template._id}`}>{template.name}</a>
      </li>
    {/each}
  </ol>

  <div class="new-template-container">
    <button onclick={() => goto("/system/templates/new")} class="ds-button" data-variant="primary"><span class="material-symbols-outlined">add</span>Ny notat-mal</button>
  </div>
</div>

<style>
  .new-template-container, .ds-list {
    margin-top: var(--ds-size-4);
  }
</style>
