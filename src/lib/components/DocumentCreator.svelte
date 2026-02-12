<script lang="ts">
  import { enhance } from "$app/forms"
  import type { AccessType } from "$lib/types/app-types"
  import type { ActionData } from "../../routes/students/[_id]/$types"
  import NoteContent from "$lib/components/NoteContent.svelte";

  type PageProps = {
    form: ActionData
    accessTypes: AccessType[]
  }

  let { form, accessTypes }: PageProps = $props()
  let documentCreatorOpen = $state(false)
  let noteType = $state()
  
  const noteSchema = {
    title: "Tittel",
    schoolNumber: "123456",
    created: "2024-06-10",
    modified: "2024-06-10",
    schemaId: "oppstartssamtale",
    schemaVersion: "999",
    content: [
      {
        "type": "h1",
        "value": "Dette er en tittel"
      },
      {
        "type": "paragraph",
        "value": "Dette er et avsnitt med litt tekst."
      },
      {
        "type": "input[text]",
        "placeholder": "Heisann",
        "label": "Beskrivelse av tekstfelt",
        "value": "",
        "required": true
      },
      {
        "type": "textarea",
        "placeholder": "Heisann",
        "label": "Beskrivelse av tekstfelt",
        "value": "",
        "required": true
      }
    ]
  }
</script>

{#if !documentCreatorOpen}
  <div class="document-creator-actions">
    <button onclick={() => documentCreatorOpen = true}>Nytt notat</button>
  </div>
{/if}
{#if documentCreatorOpen}
  <div class="document-creator">
    <div class="document-header">
      <button class="document-title">
        <h2>Nytt notat</h2>
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
          <div class="document-content-item">
            <label for="type">
              Type
            </label>
            <select id="type" name="type" required bind:value={noteType}>
              <option value="NOTE" selected>Notat</option>
              <option value="INITIAL_MEETING">Oppstartssamtale</option>
            </select>
          </div>
          <div class="document-content-item">
            <label for="title">
              Tittel
            </label>
            <input id="title" name="title" type="text" value={form?.createDocumentFailedData?.title ?? ''} required>
          </div>
          <div class="document-content-item">
            {#if accessTypes.length > 1}
              <label for="schoolNumber">
                Skolenummer
              </label>
              <select id="schoolNumber" name="schoolNumber" required>
                <option value="" disabled selected>Velg skole</option>
                {#each accessTypes as access}
                  <!-- TODO: Add school name to AccessType -->
                  <option value={access.schoolNumber}>{access.schoolNumber}</option>
                {/each}
              </select>
            {:else}
              <input id="schoolNumber" name="schoolNumber" type="text" value={accessTypes[0]?.schoolNumber ?? ''} required hidden>
            {/if}
          </div>
          <br />
          <NoteContent {form} {noteSchema} />
          <div class="document-actions">
            <button type="submit">Legg til notat</button>
            <button onclick={() => documentCreatorOpen = false}>Avbryt</button>
          </div>
      </form>
      {#if form?.createDocumentFailedData?.errorMessage}<p class="error">{form.createDocumentFailedData.errorMessage}</p>{/if}
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
  
  .document-content-item {
    margin-bottom: 0.5rem;
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