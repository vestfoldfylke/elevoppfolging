<script lang="ts">
	import { enhance } from "$app/forms"
	import type { AccessType } from "$lib/types/app-types"
	import type { AppStudent } from "$lib/types/db/shared-types"
	import type { ActionData } from "../../routes/students/[_id]/$types"

	type PageProps = {
		form: ActionData
		accessTypes: AccessType[]
	}

	let { form, accessTypes }: PageProps = $props()
	let documentCreatorOpen = $state(false)
</script>

{#if !documentCreatorOpen}
  <div class="document-creator-actions">
    <button onclick={() => documentCreatorOpen = true}>Nytt dokument</button>
  </div>
{/if}
{#if documentCreatorOpen}
  <div class="document-creator">
    <div class="document-header">
      <button class="document-title">
        <h2>Nytt dokument</h2>
      </button>
    </div>
    <div class="document-container">
      <div class="document-content">
        <form method="POST" action="?/newDocumentAction" use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === "success") {
              documentCreatorOpen = false
            }
            update()
          }
        }}>
        <label for="title">
          Title
        </label>
        <input id="title" name="title" type="text" value={form?.createDocumentFailedData?.title ?? ''}>
        {#if accessTypes.length > 1}
          <label for="schoolNumber">
            School Number
          </label>
          <select id="schoolNumber" name="schoolNumber" required>
            <option value="" disabled selected>Velg skole</option>
            {#each accessTypes as access}
              <option value={access.schoolNumber}>{access.schoolNumber}</option>
            {/each}
          </select>
        {:else}
          <input id="schoolNumber" name="schoolNumber" type="text" value={accessTypes[0]?.schoolNumber ?? ''} required hidden>
        {/if}
          <label for="type">
          Type
        </label>
        <input id="type" name="type" type="text" value="NOTE" required>
        <label for="note">
          Note
        </label>
        <textarea id="note" name="note" value={form?.createDocumentFailedData?.note ?? ''} required></textarea>
        <button type="submit">Add Document</button>
      </form>
      {#if form?.createDocumentFailedData?.errorMessage}<p class="error">{form.createDocumentFailedData.errorMessage}</p>{/if}
      </div>
      <div class="document-actions">
        <button>Lagre</button>
        <button onclick={() => documentCreatorOpen = false}>Avbryt</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .document-container {
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
  }
  .document-header {
    display: flex;
    align-items: center;
  }
  .document-title {
    flex: 1;
    display: flex;
    cursor: pointer;
    justify-content: space-between;
    border: none;
  }
  .document-container > div {
    padding: 0.5rem;
    border-bottom: 1px solid #ccc;
  }
  .document-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
  }
</style>