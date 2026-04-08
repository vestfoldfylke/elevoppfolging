<script lang="ts">
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton from "$lib/components/AsyncButton.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import { nameValidation, ssnValidation } from "$lib/data-validation/manual-student-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { canManageManualStudentsOnSchool } from "$lib/shared-authorization/authorization"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { EnrollmentWithinViewAccessWindow, FrontendOverviewStudent } from "$lib/types/app-types"
  import type { ManageManualStudentsManualAccessEntry, ManualAccessEntryInput, NewManualStudentInput } from "$lib/types/db/shared-types"
  import { getClassesFromStudents } from "$lib/utils/classes-from-students"
  import type { PageProps } from "./$types"

  type AccessEntry = {
    entraUserId: string
    name: string
    accessEntry: ManualAccessEntryInput
  }

  let { data }: PageProps = $props()

  let selectedTab: string | undefined = $derived.by(() => {
    return page.url.searchParams.get("tab")?.trim().toLowerCase()
  })
  const accessTab: string = "access"
  const manualStudentsTab: string = "manual"

  let currentSchool = $derived.by(() => {
    if (data.accessSchools.length === 0) {
      throw new Error("Ingen skoler funnet")
    }

    const school = data.accessSchools.find((school) => school.schoolNumber === page.params.schoolnumber)
    if (!school) {
      throw new Error("Skole ikke funnet")
    }

    return school
  })

  let schoolStudents = $derived.by(() => {
    return data.accessStudents.filter((student) => student.accessTypes.some((accessType) => accessType.type === "MANUELL-SKOLELEDER-TILGANG" && accessType.schoolNumber === currentSchool.schoolNumber))
  })

  let schoolClasses = $derived.by(() => {
    return getClassesFromStudents(schoolStudents).filter((classInfo) => classInfo.schoolNumber === currentSchool.schoolNumber)
  })

  let studentAccessEntries = $derived.by(() => {
    const studentsWithAccess = new Map<string, { name: string; appUsers: AccessEntry[] }>()
    for (const access of data.manualAccessForSchool) {
      for (const studentAccess of access.students) {
        if (!studentsWithAccess.has(studentAccess._id)) {
          studentsWithAccess.set(studentAccess._id, { name: schoolStudents.find((student) => student._id === studentAccess._id)?.name || `Inaktiv elev (${studentAccess._id})`, appUsers: [] })
        }
        studentsWithAccess
          .get(studentAccess._id)
          ?.appUsers.push({ entraUserId: access.entraUserId, name: access.name, accessEntry: { type: "MANUELL-ELEV-TILGANG", schoolNumber: studentAccess.schoolNumber, _id: studentAccess._id } })
      }
    }
    return Array.from(studentsWithAccess.values())
  })

  let classAccessEntries = $derived.by(() => {
    const classesWithAccess = new Map<string, { name: string; appUsers: AccessEntry[] }>()
    for (const access of data.manualAccessForSchool) {
      for (const classAccess of access.classes) {
        if (!classesWithAccess.has(classAccess.systemId)) {
          classesWithAccess.set(classAccess.systemId, {
            name: schoolClasses.find((classGroup) => classGroup.systemId === classAccess.systemId)?.name || `Inaktiv klasse (${classAccess.systemId})`,
            appUsers: []
          })
        }
        classesWithAccess.get(classAccess.systemId)?.appUsers.push({
          entraUserId: access.entraUserId,
          name: access.name,
          accessEntry: { type: "MANUELL-KLASSE-TILGANG", schoolNumber: classAccess.schoolNumber, systemId: classAccess.systemId }
        })
      }
    }
    return Array.from(classesWithAccess.values())
  })

  let manageManualStudentsAccessEntries: AccessEntry[] = $derived.by(() => {
    return data.manualAccessForSchool
      .filter((access) => access.manageManualStudentsForSchools.some((school) => school.schoolNumber === currentSchool.schoolNumber))
      .map((access) => ({
        entraUserId: access.entraUserId,
        name: access.name, // TODO - sikkert bedre å hente fra app users
        accessEntry: { type: "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG", schoolNumber: currentSchool.schoolNumber }
      }))
  })

  // new access
  let addAccessForm: HTMLFormElement | undefined = $state()
  let selectedEntraUserId = $state("")
  let selectedType: ManualAccessEntryInput["type"] | "" = $state("")
  let selectedResourceId = $state("")

  // new manual student
  let addManualStudentForm: HTMLFormElement | undefined = $state()
  let newManualStudentFnr = $state("")
  let newManualStudentName = $state("")
  let newManualStudentFormOpen = $state(false)

  const addManualAccessEntry = async (): Promise<void> => {
    const validForm = addAccessForm?.reportValidity()
    if (!validForm) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!selectedType) {
      throw new Error("Access type must be selected")
    }
    if (!selectedEntraUserId) {
      throw new Error("Entra user ID must be selected")
    }

    let accessEntryToAdd: ManualAccessEntryInput

    switch (selectedType) {
      case "MANUELL-KLASSE-TILGANG":
        if (!selectedResourceId) {
          throw new Error("Resource ID must be selected")
        }
        accessEntryToAdd = { type: selectedType, schoolNumber: currentSchool.schoolNumber, systemId: selectedResourceId }
        break
      case "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG":
      case "MANUELL-ELEV-TILGANG":
        if (!selectedResourceId) {
          throw new Error("Resource ID must be selected")
        }
        accessEntryToAdd = { type: selectedType, schoolNumber: currentSchool.schoolNumber, _id: selectedResourceId }
        break
      case "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG":
        accessEntryToAdd = { type: selectedType, schoolNumber: currentSchool.schoolNumber }
        break
      default:
        throw new Error(`Invalid access entry type: ${selectedType}`)
    }

    await apiFetch(`/api/access/${selectedEntraUserId as NoSlashString}/add`, {
      method: "POST",
      body: accessEntryToAdd,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const removeManualAccessEntry = async (entraUserId: string, accessEntry: ManualAccessEntryInput): Promise<void> => {
    await apiFetch(`/api/access/${entraUserId as NoSlashString}/remove`, {
      method: "POST",
      body: accessEntry,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const toManageManualStudentsManualAccessEntry = (manualAccessEntry: ManualAccessEntryInput): ManageManualStudentsManualAccessEntry => {
    return manualAccessEntry as ManageManualStudentsManualAccessEntry
  }

  const addNewManualStudent = async (): Promise<void> => {
    if (!addManualStudentForm?.reportValidity()) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!newManualStudentFnr) {
      throw new Error("Fødselsnummer må være fylt ut")
    }

    if (!newManualStudentName) {
      throw new Error("Navn må være fylt ut")
    }

    const newManualStudentInput: NewManualStudentInput = {
      ssn: newManualStudentFnr,
      name: newManualStudentName,
      school: currentSchool
    }

    await apiFetch(`/api/students`, {
      method: "POST",
      body: newManualStudentInput,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  let canManageManualStudents = $derived.by(() => {
    if (!data.principalAccess) {
      return false
    }

    return canManageManualStudentsOnSchool(data.principalAccess, currentSchool.schoolNumber)
  })

  let manualStudents: FrontendOverviewStudent[] = $derived.by(() => {
    return data.students.filter(
      (student: FrontendOverviewStudent) =>
        student.source === "MANUAL" && student.enrollmentsWithinViewAccessWindow.some((enrollment: EnrollmentWithinViewAccessWindow) => enrollment.school.schoolNumber === currentSchool.schoolNumber)
    )
  })

  const openNewManualStudentForm = () => {
    newManualStudentFormOpen = true
  }

  const closeNewManualStudentForm = () => {
    newManualStudentFormOpen = false
  }
</script>

<div class="page-content">
  <PageHeader title={`Skoleadministrasjon - ${currentSchool.name}`} />

  <ds-tabs class="ds-tabs">
    <ds-tablist>
      <ds-tab aria-selected={selectedTab === undefined || selectedTab === accessTab}>
        <a href={`?tab=${accessTab}`} class="no-link">Tilgangsstyring</a>
      </ds-tab>
      {#if canManageManualStudents}
        <ds-tab aria-selected={selectedTab === manualStudentsTab}>
          <a href={`?tab=${manualStudentsTab}`} class="no-link">Manuelle elever</a>
        </ds-tab>
      {/if}
    </ds-tablist>
    <ds-tabpanel>
      <h3>Manuelle programområdetilganger</h3>
      <p>Kommer kanskje hvis det er behov</p>

      <h3>Manuelle klassetilganger</h3>
      {#each classAccessEntries as classAccess}
        <h4>{classAccess.name}</h4>
        <ul>
          {#each classAccess.appUsers as appUser}
            <li>
              {appUser.name} ({appUser.entraUserId})
            </li>
            <AsyncButton onClick={() => removeManualAccessEntry(appUser.entraUserId, appUser.accessEntry)} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="delete" />
          {/each}
        </ul>
      {/each}

      <h3>Manuelle elevtilganger</h3>
      {#each studentAccessEntries as studentAccess}
        <h4>{studentAccess.name}</h4>
        <ul>
          {#each studentAccess.appUsers as appUser}
            <li>
              {appUser.name} ({appUser.entraUserId})
            </li>
            <AsyncButton onClick={() => removeManualAccessEntry(appUser.entraUserId, appUser.accessEntry)} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="delete" />
          {/each}
        </ul>
      {/each}

      <h3>Tilgang til å administrere manuelle elever</h3>
      {#each manageManualStudentsAccessEntries as manageManualStudentsAccess}
        <ul>
          <li>
            {manageManualStudentsAccess.name} ({manageManualStudentsAccess.entraUserId})
          </li>
          <AsyncButton onClick={() => removeManualAccessEntry(manageManualStudentsAccess.entraUserId, toManageManualStudentsManualAccessEntry(manageManualStudentsAccess.accessEntry))} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="delete" />
        </ul>
      {/each}

      <br />
      <div class="new-access">
        <h3>Ny manuell tilgang</h3>
        <p>Tilganger for lærere gjøres i InSchool</p>

        <form bind:this={addAccessForm}>
          <div>
            <!-- TODO - lag en people select med litt søk og fancy, og bind mulighet -->
            <label for="appUser">Velg bruker</label>
            <select id="appUser" name="appUser" bind:value={selectedEntraUserId} required>
              {#each data.appUsers as appUser}
                <option value={appUser.entra.id}>{appUser.entra.displayName} ({appUser.entra.companyName})</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="accessType">Tilgangstype:</label>
            <select id="accessType" bind:value={selectedType} required>
              <!-- TODO: mer dynamisk liste med valg og hjelpetekst -->
              <option value="" disabled>Velg tilgangstype</option>
              <option value="MANUELL-KLASSE-TILGANG">Manuell klassetilgang</option>
              <option value="MANUELL-ELEV-TILGANG">Manuell elevtilgang</option>
              <option value="MANUELL-OPPRETT-MANUELL-ELEV-TILGANG">Tilgang til å administrere manuelle elever</option>
            </select>
          </div>

          {#if selectedType === "MANUELL-KLASSE-TILGANG"}
            <div>
              <label for="class">Velg klasse:</label>
              <select id="class" bind:value={selectedResourceId} required>
                <option value="" disabled>Velg klasse</option>
                {#each schoolClasses as classInfo}
                  <option value={classInfo.systemId}>{classInfo.name}</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if selectedType === "MANUELL-ELEV-TILGANG"}
            <div>
              <label for="student">Velg elev:</label>
              <select id="student" bind:value={selectedResourceId} required>
                <option value="" disabled>Velg elev</option>
                {#each schoolStudents.sort((a, b) => a.name.localeCompare(b.name)) as student}
                  <option value={student._id}>{student.name}</option>
                {/each}
              </select>
            </div>
          {/if}
        </form>

        <AsyncButton onClick={addManualAccessEntry} reloadPageDataOnSuccess={true} buttonText="Legg til tilgang"  iconName="add" />

      </div>
    </ds-tabpanel>
    {#if canManageManualStudents}
      <ds-tabpanel>
        <div class="new-manual-student">
          {#if !newManualStudentFormOpen}
            <h2 class="ds-heading">Manuelle elever</h2>
            <button class="ds-button" onclick={openNewManualStudentForm}><span class="material-symbols-outlined">note_add</span>Ny manuell elev</button>
          {:else}
            <h2 class="ds-heading">Ny manuell elev</h2>
          {/if}
        </div>
  
        {#if newManualStudentFormOpen}
          <div class="new-manual-student-form">
            <form bind:this={addManualStudentForm}>
              <ds-field class="ds-field content-item">
                <label class="ds-label" data-weight="medium" for="fnr">
                  Fødselsnummer
                  <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
                </label>
                <div class="ds-field-affixes">
                  <input class="ds-input" inputmode="numeric" type="text" id="fnr" pattern={ssnValidation.pattern.source} minlength={ssnValidation.minLength} maxlength={ssnValidation.maxLength} bind:value={newManualStudentFnr} required>
                </div>
              </ds-field>
  
              <ds-field class="ds-field content-item">
                <label class="ds-label" data-weight="medium" for="name">
                  Navn
                  <span class="ds-tag" data-variant="outline" data-size="sm" data-color="warning" style="margin-inline-start:var(--ds-size-2)">Må fylles ut</span>
                </label>
                <div class="ds-field-affixes">
                  <input class="ds-input" type="text" id="name" pattern={nameValidation.pattern.source} minlength={nameValidation.minLength} maxlength={nameValidation.maxLength} bind:value={newManualStudentName} required>
                </div>
              </ds-field>
            </form>
  
            <div class="manual-student-actions">
              <AsyncButton onClick={addNewManualStudent} reloadPageDataOnSuccess={true} buttonText="Legg til ny manuell elev" iconName="add" />
              <button class="ds-button" type="button" data-variant="secondary" onclick={closeNewManualStudentForm}><span class="material-symbols-outlined">close</span>Avbryt</button>
            </div>
          </div>
        {/if}
  
        <div class="manual-students">
          {#if manualStudents.length > 0 }
            <table class="ds-table">
              <thead>
                <tr>
                  <th aria-sort="ascending">
                    <button type="button">Navn</button>
                  </th>
                  <th>
                    Rediger
                  </th>
                </tr>
              </thead>
              <tbody>
              {#each manualStudents as manualStudent}
                <tr>
                  <td>
                    <a href={`/students/${manualStudent._id}`} class="ds-link" rel="noopener noreferrer">{manualStudent.name}</a>
                  </td>
                  <td>
                    <a href={`${page.url.pathname}/manualstudents/${manualStudent._id}`} class="ds-link" rel="noopener noreferrer">Rediger</a>
                  </td>
                </tr>
              {/each}
              </tbody>
            </table>
          {:else}
            <span>Ingen manuelle elever her</span>
          {/if}
        </div>
      </ds-tabpanel>
    {/if}
  </ds-tabs>
</div>


<style>
  .no-link {
      text-decoration: none;
      color: inherit;
  }
  .new-manual-student {
      display: flex;
      align-items: center;
      justify-content: space-between;
  }
  
  .manual-student-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
  }
  
  .manual-students {
      margin-top: var(--ds-size-4);
  }
</style>
