<script lang="ts">
  import TemplateEditor from "$lib/components/TemplateEditor/TemplateEditor.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()
</script>

<h1>{data.template.name || "Ny notat-mal"}</h1>

{#key data.template._id} <!-- If new template, new component please -->
  <TemplateEditor template={data.template} />
{/key}

<style>
</style>
