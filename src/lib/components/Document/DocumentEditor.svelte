<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { StudentAccessPerson } from "$lib/types/app-types"
  import type { DocumentInput, SchoolInfo } from "$lib/types/db/shared-types"
  import AsyncButton from "../AsyncButton.svelte"
  import PrincipalAccessTags from "../PrincipalAccessTags.svelte"
  import DocumentContentItem from "./DocumentContentItem.svelte"

  type EditorProps = {
    documentId?: string
    studentId?: string
    groupSystemId?: string
    currentDocument: DocumentInput
    accessSchools: SchoolInfo[]
    studentDataSharingConsent?: boolean
    studentAccessPersons?: StudentAccessPerson[]
    emailAlertAvailable?: boolean
    closeEditor: () => void
  }

  let { documentId, studentId, groupSystemId, accessSchools, currentDocument = $bindable(), studentDataSharingConsent, studentAccessPersons, emailAlertAvailable, closeEditor }: EditorProps = $props()

  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupSystemId
  if (!studentId && !groupSystemId) {
    throw new Error("Student ID or Group System ID is required to create a new document")
  }
  // svelte-ignore state_referenced_locally det går bra så lenge denne komponenten remounter ved endring av studentId/groupSystemId
  if (studentId && groupSystemId) {
    throw new Error("Both Student ID and Group System ID provided, only one should be provided")
  }

  let documentEditorForm: HTMLFormElement | undefined = $state()

  const toggleSubjectTeacherAccess = (): void => {
    currentDocument.documentAccess = currentDocument.documentAccess === "ALL_WITH_STUDENT_ACCESS" ? "EXCLUDE_SUBJECT_TEACHERS" : "ALL_WITH_STUDENT_ACCESS"
  }

  const newDocument = async (): Promise<void> => {
    if (!documentEditorForm) {
      throw new Error("Document editor form not found")
    }

    const formIsValid = documentEditorForm.reportValidity()
    if (!formIsValid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (groupSystemId) {
      const createDocumentRoute = `/api/classes/${groupSystemId as NoSlashString}/documents` as const

      await apiFetch(createDocumentRoute, {
        method: "POST",
        body: currentDocument,
        headers: {
          "Content-Type": "application/json"
        }
      })

      return
    }

    if (studentId) {
      const createDocumentRoute = `/api/students/${studentId as NoSlashString}/documents` as const

      await apiFetch(createDocumentRoute, {
        method: "POST",
        body: currentDocument,
        headers: {
          "Content-Type": "application/json"
        }
      })
    }
  }

  const updateDocument = async (): Promise<void> => {
    if (!documentId) {
      throw new Error("Document ID is required for updating a document")
    }

    if (!documentEditorForm) {
      throw new Error("Document editor form not found")
    }

    const formIsValid = documentEditorForm.reportValidity()
    if (!formIsValid) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (groupSystemId) {
      const updateDocumentRoute = `/api/classes/${groupSystemId as NoSlashString}/documents/${documentId as NoSlashString}` as const

      await apiFetch(updateDocumentRoute, {
        method: "PATCH",
        body: currentDocument,
        headers: {
          "Content-Type": "application/json"
        }
      })

      return
    }

    if (studentId) {
      const updateDocumentRoute = `/api/students/${studentId as NoSlashString}/documents/${documentId as NoSlashString}` as const

      await apiFetch(updateDocumentRoute, {
        method: "PATCH",
        body: currentDocument,
        headers: {
          "Content-Type": "application/json"
        }
      })
    }
  }
</script>

<div class="document-content">
  <form bind:this={documentEditorForm}>
    {#if accessSchools.length > 1 && !documentId} <!-- Only show school selector when creating a new document and there are multiple access schools -->
      <ds-field class="ds-field content-item">
        <label for="schoolNumber" class="ds-label" data-weight="medium">
          Skole
          <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må velges</span>
        </label>
        <div data-field="description">
          Du har tilgang til denne eleven ved flere skoler, og må velge hvilken skole notatet er knyttet til.
        </div>
        <select id="schoolNumber" class="ds-input"  data-width="auto" name="schoolNumber" bind:value={currentDocument.school} required>
          <option value="" disabled selected>Velg skole</option>
          {#each accessSchools as school}
            <option value={school}>{school.name}</option>
          {/each}
        </select>
      </ds-field>
    {/if}

    <ds-field class="ds-field content-item">
      <label for="documentTitle" class="ds-label" data-weight="medium">
        Tittel
        <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
      </label>
      <input autocomplete="off" id="documentTitle" class="ds-input" name="documentTitle" type="text" bind:value={currentDocument.title} required>
    </ds-field>

    {#each currentDocument.content as _contentItem, index}
      <DocumentContentItem bind:contentItem={currentDocument.content[index]} {index} editMode={true} />
    {/each}

    {#if studentId }
      <fieldset class="ds-fieldset content-item">
        <legend class="ds-label" data-weight="medium">
          Tilgangsstyring
        </legend>
        <p class="ds-paragraph" data-variant="default">
          Som standard vil notatet være synlig for alle brukere med tilgang til eleven ved {currentDocument.school.name}, unntatt faglærere. Dersom du ønsker at også faglærere skal kunne se notatet, kan du krysse av for dette alternativet.
          I tillegg vil brukere ved andre skoler få tilgang til notatet dersom eleven har samtykket til deling av informasjon med andre skoler.
          Du vil ha tilgang til notatet uavhengig av disse innstillingene, siden du oppretter notatet.
        </p>
        <ds-field class="ds-field">
          <input id="document-access-{documentId}" class="ds-input" type="checkbox" checked={currentDocument.documentAccess === "ALL_WITH_STUDENT_ACCESS"} onchange={toggleSubjectTeacherAccess}/>
          <label for="document-access-{documentId}" class="ds-label" data-weight="regular">Synlig for faglærere</label>
        </ds-field>
      </fieldset>
    {/if}

    {#if studentAccessPersons && studentAccessPersons.length > 0}
      <fieldset class="ds-fieldset content-item">
        <legend class="ds-label" data-weight="medium">
          Følgende personer skal varsles på e-post når notatet lagres
          <span class="ds-tag" data-variant="outline" data-color="warning" data-size="xs" style="margin-left: var(--ds-size-1)">Obs! Denne gjør ingenting enda, bare for testing</span>
        </legend>

        {#each studentAccessPersons as accessPerson}
          <ds-field class="ds-field">
            <input id={accessPerson.entra.id} class="ds-input" type="checkbox" value="email"/>
            <label for={accessPerson.entra.id} class="ds-label" data-weight="regular">
              {accessPerson.entra.displayName}
              <PrincipalAccessTags principalAccessForStudent={accessPerson.principalAccessForStudent} />
            </label>
          </ds-field>
        {/each}
      </fieldset>
    {/if}

  </form>
</div>
<div class="document-actions">
  {#if !documentId}
    <AsyncButton buttonText="Lagre notat" onClick={newDocument} reloadPageDataOnSuccess={true} callBackAfterReloadPageData={closeEditor} iconName="save" />
  {/if}
  {#if documentId}
    <!--TODO sjekk om det er gjort endringer først da... -->
    <AsyncButton buttonText="Lagre endringer" onClick={updateDocument} reloadPageDataOnSuccess={true} callBackAfterReloadPageData={closeEditor} iconName="save" />
  {/if}
  <button class="ds-button" type="button" data-variant="secondary" onclick={closeEditor}><span class="material-symbols-outlined">close</span>Avbryt</button>
</div>

<style>
  .document-content {
    margin-top: 1rem;
  }
  .document-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
</style>