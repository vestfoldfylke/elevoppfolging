<script lang="ts">
  import type { DocumentContentItem } from "$lib/types/db/shared-types"
  import type { ActionData } from "../../../routes/students/[_id]/$types"

  type NoteProps = {
    editMode: boolean
    form: ActionData
    content: DocumentContentItem[]
  }

  let { editMode, form, content }: NoteProps = $props()
</script>

{#each content as contentItem, index}
  {#if editMode}
    <input type="hidden" name="contentItem-{index}" value={JSON.stringify(contentItem)} />
  {/if}

  {#if contentItem.type === "h1"}
    <h1>{contentItem.value}</h1>
  {/if}

  {#if contentItem.type === "p"}
    <p>{contentItem.value}</p>
  {/if}

  {#if contentItem.type === "inputText"}
    <div class="document-content-item">
      <label for={contentItem.label}>{contentItem.label}</label>
      <input disabled={!editMode} type="text" id={contentItem.label} name="contentItem-{index}" placeholder={contentItem.placeholder} value={form?.createDocumentFailedData?.content[index] || contentItem.value} required={contentItem.required} />
    </div>
  {/if}
  
  {#if contentItem.type === "textarea"}
    <div class="document-content-item">
      <label for={contentItem.label}>{contentItem.label}</label>
      <textarea disabled={!editMode} id={contentItem.label} name="contentItem-{index}" placeholder={contentItem.placeholder} required={contentItem.required}>{form?.createDocumentFailedData?.content[index] || contentItem.value}</textarea>
    </div>
  {/if}
{/each}

<style>
  
</style>