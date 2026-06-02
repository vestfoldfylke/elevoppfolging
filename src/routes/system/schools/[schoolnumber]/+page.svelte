<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton, { type AsyncButtonResult } from "$lib/components/AsyncButton.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import SuggestionSelect from "$lib/components/SchoolAdministration/SuggestionSelect.svelte"
  import { schoolNameValidation } from "$lib/data-validation/school-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { SuggestionSelectItem } from "$lib/types/app-types"
  import type { Access, AppUser, SchoolLeaderManualAccessEntry, UpdateSchool } from "$lib/types/db/shared-types"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let currentSchool = $derived.by(() => {
    if (data.schools.length === 0) {
      throw new Error("Ingen skoler funnet")
    }

    const school = data.schools.find((school) => school.schoolNumber === page.params.schoolnumber)
    if (!school) {
      throw new Error("Skole ikke funnet")
    }

    return school
  })

  let schoolLeaders: AppUser[] = $derived.by(() => {
    return data.schoolLeaderAccess
      .filter((access: Access) => access.leaderForSchools.some((school: SchoolLeaderManualAccessEntry) => school.schoolNumber === currentSchool.schoolNumber))
      .map((access: Access) => data.appUsers.find((appUser: AppUser) => appUser.entra.id === access.entraUserId))
      .filter((user: AppUser | undefined) => user !== undefined)
      .sort((a: AppUser, b: AppUser) => a.entra.displayName.localeCompare(b.entra.displayName))
  })

  let suggestionSelectUsers: SuggestionSelectItem[] = $derived.by(() => {
    // TODO: Show only users for this school?
    return data.appUsers
      .sort((a: AppUser, b: AppUser) => a.entra.displayName.localeCompare(b.entra.displayName))
      .map((appUser: AppUser) => ({ label: `${appUser.entra.displayName} (${appUser.entra.companyName})`, value: appUser.entra.id }))
  })

  let addSchoolLeaderOpen = $state(false)

  const deleteManualSchool = async (): Promise<AsyncButtonResult> => {
    const confirmDelete = confirm(`Er du sikker på at du vil slette skolen "${currentSchool.name}"? Dette kan ikke angres.`)

    if (!confirmDelete) {
      return { status: 'cancelled' }
    }

    await apiFetch(`/api/schools/${currentSchool.schoolNumber as NoSlashString}`, {
      method: "DELETE"
    })

    // redirect to schools admin page and reload dependent data
    await goto("/system/schools", { invalidateAll: true })

    return { status: 'success' }
  }

  let selectedEntraUserId = $state("")

  let updateSchoolEdit: boolean = $state(false)
  let updateSchoolForm: HTMLFormElement | undefined = $state()
  let updateSchoolName: string = $derived.by(() => currentSchool.name)

  const updateSchool = async (): Promise<AsyncButtonResult> => {
    if (!updateSchoolForm?.reportValidity()) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!updateSchoolName) {
      throw new Error("Skolenavn må være fylt ut")
    }

    const updateSchoolInput: UpdateSchool = {
      name: updateSchoolName,
      schoolNumber: currentSchool.schoolNumber
    }

    await apiFetch(`/api/schools/${currentSchool.schoolNumber as NoSlashString}`, {
      method: "PUT",
      body: updateSchoolInput,
      headers: {
        "Content-Type": "application/json"
      }
    })

    return { status: 'success', reloadPageData: true, callBack: () => { updateSchoolEdit = false } }
  }

  const abortUpdateSchool = () => {
    updateSchoolEdit = false
    updateSchoolName = currentSchool.name
  }

  const isDisabled = (): boolean => {
    return updateSchoolName === currentSchool.name
  }

  const resetAddSchoolLeaderAccess = (): void => {
    addSchoolLeaderOpen = false
    selectedEntraUserId = ""
  }

  const addSchoolLeaderAccess = async (): Promise<AsyncButtonResult> => {
    await apiFetch(`/api/access/${selectedEntraUserId as NoSlashString}/add`, {
      method: "POST",
      body: {
        type: "MANUELL-SKOLELEDER-TILGANG",
        schoolNumber: currentSchool.schoolNumber
      },
      headers: {
        "Content-Type": "application/json"
      }
    })

    return { status: 'success', reloadPageData: true, callBack: resetAddSchoolLeaderAccess }
  }

  const removeSchoolLeaderAccess = async (entraUserId: string): Promise<AsyncButtonResult> => {
    await apiFetch(`/api/access/${entraUserId as NoSlashString}/remove`, {
      method: "POST",
      body: {
        type: "MANUELL-SKOLELEDER-TILGANG",
        schoolNumber: currentSchool.schoolNumber
      },
      headers: {
        "Content-Type": "application/json"
      }
    })

    return { status: 'success', reloadPageData: true }
  }
</script>

<div class="page-content">
  <div class="update-school-link">
    <a href="/system/schools" class="ds-link" rel="noopener noreferrer">
      <span class="material-symbols-outlined">arrow_back</span>
      Tilbake til skoler
    </a>
  </div>

  <PageHeader title={`Skoleadministrasjon - ${currentSchool.name}`} />

  {#if !updateSchoolEdit}
    <div class="update-school">
      <div>
        <h2 class="ds-heading">Skolenummer</h2>
        <p class="ds-paragraph">{currentSchool.schoolNumber}</p>
      </div>

      <div>
        <h2 class="ds-heading">Kilde</h2>
        <p class="ds-paragraph">{currentSchool.source}</p>
      </div>

      {#if currentSchool.source === "MANUAL" }
        <div class="update-school-actions">
          <button onclick={() => updateSchoolEdit = true} class="ds-button" type="button">
            <span class="material-symbols-outlined">edit</span>
            Rediger
          </button>
          <AsyncButton onClick={deleteManualSchool} buttonText="Slett skole" iconName="delete" color="danger" />
        </div>
      {/if}
    </div>
  {:else}
    <div class="update-school-form">
      <form bind:this={updateSchoolForm}>
        <ds-field class="ds-field content-item">
          <label class="ds-label" data-weight="medium" for="schoolName">
            Skolenavn
            <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
          </label>
          <div class="ds-field-affixes">
            <input class="ds-input" type="text" id="schoolName" pattern={schoolNameValidation.pattern.source} minlength={schoolNameValidation.minLength} maxlength={schoolNameValidation.maxLength} bind:value={updateSchoolName} required>
          </div>
        </ds-field>

        <div class="content-item">
          <h2 class="ds-heading">Skolenummer</h2>
          <p class="ds-paragraph">{currentSchool.schoolNumber}</p>
        </div>

        <div class="content-item">
          <h2 class="ds-heading">Kilde</h2>
          <p class="ds-paragraph">{currentSchool.source}</p>
        </div>

        <div class="update-school-actions">
          <AsyncButton onClick={updateSchool} buttonText="Lagre" iconName="save" disabled={isDisabled()} />
          <button class="ds-button" type="button" data-variant="secondary" onclick={abortUpdateSchool}>
            <span class="material-symbols-outlined">close</span>
            Avbryt
          </button>
        </div>
      </form>
    </div>
  {/if}

  <h2>Skoleledere</h2>
  <div class="ds-alert" data-color="info">Kan administrere tilganger på skolen, og se alle elevene på skolen</div>

  <div class="access-group">
    {#if schoolLeaders.length > 0}
      <table class="ds-table">
        <thead>
          <tr>
            <th aria-sort="none">Bruker</th>
            <th>Handling</th>
          </tr>
        </thead>
        <tbody>
          {#each schoolLeaders as schoolLeader}
            <tr>
              <td>{schoolLeader.entra.displayName} ({schoolLeader.entra.companyName})</td>
              <td>
                <AsyncButton onClick={() => removeSchoolLeaderAccess(schoolLeader.entra.id)} buttonText="Fjern skoleleder" iconName="cancel" variant="secondary" color="danger" dataSize="sm" />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="ds-paragraph">Ingen skoleledere å se her</p>
    {/if}
  </div>

  <div class="new-access">
    {#if addSchoolLeaderOpen}
      <h3 class="ds-heading">Legg til skoleleder</h3>
      <form>
        <SuggestionSelect items={suggestionSelectUsers} bind:value={selectedEntraUserId} label="Velg bruker" />

        <div class="new-access-actions">
          <AsyncButton onClick={addSchoolLeaderAccess} buttonText="Legg til skoleleder" iconName="add" />

          <button class="ds-button" type="button" data-variant="secondary" onclick={resetAddSchoolLeaderAccess}>
            <span class="material-symbols-outlined">close</span>
            Avbryt
          </button>
        </div>
      </form>
    {:else}
      <button class="ds-button" type="button" data-variant="secondary" onclick={() => addSchoolLeaderOpen = true}>
        <span class="material-symbols-outlined">add</span>
        Legg til ny skoleleder
      </button>
    {/if}
  </div>
</div>

<style>
  .update-school-link {
    padding-bottom: var(--ds-size-4);
  }

  .update-school {
    display: flex;
    flex-direction: column;
    gap: var(--ds-size-4);
  }

  .update-school-actions {
    display: flex;
    gap: var(--ds-size-2);
    justify-content: flex-end;
  }

  .access-group {
    margin: var(--ds-size-8) 0;
  }

  .new-access {
    margin-top: var(--ds-size-4);
  }

  .new-access-actions {
    display: flex;
    gap: var(--ds-size-2);
    margin-top: var(--ds-size-4);
  }
</style>
