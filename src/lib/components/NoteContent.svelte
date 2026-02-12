<script lang="ts">
  import type { ActionData } from "../../routes/students/[_id]/$types"

  type NoteProps = {
    form: ActionData,
    noteSchema: {
      title: string
      schoolNumber: string
      created: string
      modified: string
      schemaId: string
      schemaVersion: string
      content: any[]
    }
  }

  let { form, noteSchema }: NoteProps = $props()

</script>

{#each noteSchema.content as contentItem}
  {#if contentItem.type === "h1"}
    <h1>{contentItem.value}</h1>
    <input type="hidden" name="h1" value={contentItem.value} />
  {:else if contentItem.type === "paragraph"}
    <p>{contentItem.value}</p>
    <input type="hidden" name="p" value={contentItem.value} />
  {:else if contentItem.type === "input[text]"}
    <div class="document-content-item">
      <label for={contentItem.label}>{contentItem.label}</label>
      <input type="text" id={contentItem.label} name={contentItem.label} placeholder={contentItem.placeholder} required={contentItem.required} />
    </div>
  {:else if contentItem.type === "textarea"}
    <div class="document-content-item">
      <label for={contentItem.label}>{contentItem.label}</label>
      <textarea id={contentItem.label} name={contentItem.label} placeholder={contentItem.placeholder} required={contentItem.required}></textarea>
    </div>
  {/if}
{/each}

<style>
  
</style>