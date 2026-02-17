<script lang="ts">
  import { enhance } from "$app/forms"
  import TemplateEditor from "$lib/components/TemplateEditor/TemplateEditor.svelte"
  import type { ActionData, PageProps } from "./$types"

  let { data }: PageProps = $props()
</script>

<h1>{data.template.name}</h1>

<TemplateEditor initialTemplate={data.template} />

<div class="template-actions">
  <form method="POST" action="?/deleteDocumentContentTemplateAction" use:enhance={() => {
    return async ({ result, update }) => {
      if (result.type === "success") {
        alert("Mal sletta! og redirect ellerno fett")
        await update()
      }
      if (result.type === "failure") {
        alert("Noe gikk galt ved sletting av malen, prøv igjen senere")
        const failureResult = result.data as ActionData
        console.log(failureResult)
      }
    }
  }}>
    <input type="hidden" name="templateId" value={data.template._id} />
    <button type="submit">Slett mal</button>
  </form>
</div>


<style>

</style>
