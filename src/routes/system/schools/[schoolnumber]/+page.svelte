<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton from "$lib/components/AsyncButton.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
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

  let addSchoolLeaderOpen = $state(false)

  const deleteManualSchool = async (): Promise<void> => {
    const confirmDelete = confirm(`Er du sikker på at du vil slette skolen "${currentSchool.name}"? Dette kan ikke angres.`)

    if (!confirmDelete) {
      return
    }

    await apiFetch(`/api/schools/${currentSchool.schoolNumber as NoSlashString}`, {
      method: "DELETE"
    })

    // redirect to schools admin page and reload dependent data
    goto("/system/schools", { invalidateAll: true })
  }

  let schoolLeaderForm: HTMLFormElement | undefined = $state()
  let selectedEntraUserId = $state("")

  const addSchoolLeaderAccess = async (): Promise<void> => {
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
  }

  const removeSchoolLeaderAccess = async (entraUserId: string): Promise<void> => {
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
  }
</script>

<div class="page-content">
  <PageHeader title="Skoleadministrasjon" />

  <h2>{currentSchool.name}</h2>
  {#if currentSchool.source === "MANUAL"}
    <AsyncButton onClick={deleteManualSchool} buttonText="Slett skole"  iconName="delete" />    
  {/if}

  <p>Skolenummer: {currentSchool.schoolNumber}</p>
  <p>Kilde: {currentSchool.source}</p>


  <h2>Skoleledere</h2>
  <p>Kan administrere tilganger på skolen, og se alle elevene på skolen</p>

  <div class="add-school-leader">
    {#if !addSchoolLeaderOpen}
      <button onclick={() => addSchoolLeaderOpen = true}>Legg til ny skoleleder</button>
    {/if}
    {#if addSchoolLeaderOpen}
      <h3>Legg til skoleleder</h3>
      <form bind:this={schoolLeaderForm}>
        <div class="form-group">
          <!-- TODO - lag en people select med litt søk og fancy, og bind mulighet -->
          <label for="appUser">Velg bruker</label>
          <select id="appUser" name="appUser" bind:value={selectedEntraUserId} required>
            {#each data.appUsers as appUser}
              <option value={appUser.entra.id}>{appUser.entra.displayName} ({appUser.entra.companyName})</option>
            {/each}
          </select>
        </div>
      </form>
      <div class="new-school-leader-actions">
        <AsyncButton onClick={addSchoolLeaderAccess} buttonText="Legg til skoleleder" reloadPageDataOnSuccess={true}  iconName="add" callBackAfterReloadPageData={() => { addSchoolLeaderOpen = false; selectedEntraUserId = ""; }} />
        <button onclick={() => addSchoolLeaderOpen = false} class="filled danger">Avbryt</button>
      </div>
    {/if}
  </div>

  {#each data.schoolLeaderAccess.filter((access) => access.leaderForSchools.some((school) => school.schoolNumber === currentSchool.schoolNumber)) as schoolLeaderAccess}
    <div class="school-leader-access-entry">
      <p>Skoleleder: {schoolLeaderAccess.name}</p>
      <AsyncButton onClick={() => removeSchoolLeaderAccess(schoolLeaderAccess.entraUserId)} reloadPageDataOnSuccess={true} buttonText="Fjern skoleleder"  iconName="delete" />
    </div>
  {/each}
</div>


<style>
</style>
