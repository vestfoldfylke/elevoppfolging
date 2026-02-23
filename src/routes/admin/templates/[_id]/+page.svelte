<script lang="ts">
    import PageHeader from "$lib/components/PageHeader.svelte";
  import TemplateEditor from "$lib/components/TemplateEditor/TemplateEditor.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()
</script>

<PageHeader title={data.template.name || "Ny notat-mal"} />

{#key data.template._id} <!-- If new template, new component please -->
  <TemplateEditor template={data.template} />
{/key}

<style>
</style>
