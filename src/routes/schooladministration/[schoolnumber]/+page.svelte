<script lang="ts">
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton from "$lib/components/AsyncButton.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import { nameValidation, ssnValidation } from "$lib/data-validation/manual-student-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { canGrantAndRemoveAccessForSchool, canManageManualStudentsOnSchool } from "$lib/shared-authorization/authorization"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { EnrollmentWithinViewAccessWindow, FrontendOverviewStudent, NewManualAccessControl } from "$lib/types/app-types"
  import type { ClassManualAccessEntry, ManageManualStudentsManualAccessEntry, ManualAccessEntryInput, NewManualStudentInput, StudentManualAccessEntry } from "$lib/types/db/shared-types"
  import { getClassesFromStudents } from "$lib/utils/classes-from-students"
  import type { PageProps } from "./$types"

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

  // ACCESS CONTROL
  let canManageAccess = $derived.by(() => {
    if (!data.principalAccess) {
      return false
    }
    return canGrantAndRemoveAccessForSchool(currentSchool.schoolNumber, data.principalAccess)
  })

  let schoolStudents: FrontendOverviewStudent[] = $derived.by(() => {
    return data.students.filter((student) => student.accessTypes.some((accessType) => accessType.type === "MANUELL-SKOLELEDER-TILGANG" && accessType.schoolNumber === currentSchool.schoolNumber))
  })

  let schoolClasses = $derived.by(() => {
    return getClassesFromStudents(schoolStudents).filter((classInfo) => classInfo.school.schoolNumber === currentSchool.schoolNumber)
  })

  type SortDirection = "ascending" | "descending"

  const toggleSort = (sortConfig: { column: string; direction: SortDirection }, sortByColumn: string) => {
    if (sortConfig.column === sortByColumn) {
      sortConfig.direction = sortConfig.direction === "ascending" ? "descending" : "ascending"
      return
    }
    sortConfig.column = sortByColumn
    sortConfig.direction = "ascending"
  }

  const getAppUserInfo = (entraUserId: string): { name: string; companyName: string } => {
    const appUser = data.appUsers.find((appUser) => appUser.entra.id === entraUserId)
    return {
      name: appUser ? appUser.entra.displayName : `Ukjent bruker (${entraUserId})`,
      companyName: appUser?.entra.companyName || "Ukjent"
    }
  }

  let classAccessEntriesSort: { column: "klasse" | "bruker"; direction: SortDirection } = $state({
    column: "klasse",
    direction: "ascending"
  })

  type ClassAccessEntry = {
    className: string
    entraUser: {
      id: string
      name: string
      companyName: string
    }
    accessEntry: ClassManualAccessEntry
  }

  let classAccessEntries: ClassAccessEntry[] = $derived.by(() => {
    const classAccessRows: ClassAccessEntry[] = []
    for (const access of data.manualAccessForSchool) {
      for (const classAccessEntry of access.classes) {
        if (classAccessEntry.type !== "MANUELL-KLASSE-TILGANG") {
          throw new Error(`Uventet access entry type for klasse: ${classAccessEntry.type}`)
        }

        const classInfo = schoolClasses.find((classGroup) => classGroup.systemId === classAccessEntry.systemId)
        const className = classInfo ? classInfo.name : `Inaktiv klasse (${classAccessEntry.systemId})`
        const appUserInfo = getAppUserInfo(access.entraUserId)

        classAccessRows.push({
          className,
          entraUser: {
            id: access.entraUserId,
            name: appUserInfo.name,
            companyName: appUserInfo.companyName
          },
          accessEntry: classAccessEntry
        })
      }
    }
    return classAccessRows.sort((a, b) => {
      switch (classAccessEntriesSort.column) {
        case "klasse": {
          const compareResult = a.className.localeCompare(b.className)
          return classAccessEntriesSort.direction === "ascending" ? compareResult : -compareResult
        }
        case "bruker": {
          const compareResult = a.entraUser.name.localeCompare(b.entraUser.name)
          return classAccessEntriesSort.direction === "ascending" ? compareResult : -compareResult
        }
        default: {
          return 0
        }
      }
    })
  })

  let studentAccessEntriesSort: { column: "elev" | "bruker"; direction: SortDirection } = $state({
    column: "elev",
    direction: "ascending"
  })

  type StudentAccessEntry = {
    student: {
      feideName: string
      name: string
    }
    entraUser: {
      id: string
      name: string
      companyName: string
    }
    accessEntry: StudentManualAccessEntry
  }

  let studentAccessEntries: StudentAccessEntry[] = $derived.by(() => {
    const studentAccessRows: StudentAccessEntry[] = []
    for (const access of data.manualAccessForSchool) {
      for (const studentAccessEntry of access.students) {
        const studentInfo = schoolStudents.find((student) => student._id === studentAccessEntry._id)
        const studentName = studentInfo ? studentInfo.name : `Inaktiv elev (${studentAccessEntry._id})`
        const studentFeideName = studentInfo ? studentInfo.feideName : `Inaktiv elev (${studentAccessEntry._id})`
        const appUserInfo = getAppUserInfo(access.entraUserId)

        studentAccessRows.push({
          student: {
            feideName: studentFeideName,
            name: studentName
          },
          entraUser: {
            id: access.entraUserId,
            name: appUserInfo.name,
            companyName: appUserInfo.companyName
          },
          accessEntry: studentAccessEntry
        })
      }
    }
    return studentAccessRows.sort((a, b) => {
      switch (studentAccessEntriesSort.column) {
        case "elev": {
          const compareResult = a.student.name.localeCompare(b.student.name)
          return studentAccessEntriesSort.direction === "ascending" ? compareResult : -compareResult
        }
        case "bruker": {
          const compareResult = a.entraUser.name.localeCompare(b.entraUser.name)
          return studentAccessEntriesSort.direction === "ascending" ? compareResult : -compareResult
        }
        default: {
          return 0
        }
      }
    })
  })

  let manageManualStudentsAccessEntriesSort: { column: "bruker"; direction: SortDirection } = $state({
    column: "bruker",
    direction: "ascending"
  })

  type ManualStudentsAccessEntry = {
    entraUser: {
      id: string
      name: string
      companyName: string
    }
    accessEntry: ManageManualStudentsManualAccessEntry
  }

  let manageManualStudentsAccessEntries: ManualStudentsAccessEntry[] = $derived.by(() => {
    const accessRows: ManualStudentsAccessEntry[] = []
    for (const access of data.manualAccessForSchool) {
      for (const manageManualStudentsAccessEntry of access.manageManualStudentsForSchools) {
        const appUserInfo = getAppUserInfo(access.entraUserId)
        accessRows.push({
          entraUser: {
            id: access.entraUserId,
            name: appUserInfo.name,
            companyName: appUserInfo.companyName
          },
          accessEntry: manageManualStudentsAccessEntry
        })
      }
    }
    return accessRows.sort((a, b) => {
      const compareResult = a.entraUser.name.localeCompare(b.entraUser.name)
      return manageManualStudentsAccessEntriesSort.direction === "ascending" ? compareResult : -compareResult
    })
  })

  // new access
  let newClassAccessControl: NewManualAccessControl = $state({
    type: "MANUELL-KLASSE-TILGANG",
    name: "klassetilgang",
    open: false,
    form: undefined,
    classId: "",
    entraUserId: ""
  })

  let newStudentAccessControl: NewManualAccessControl = $state({
    type: "MANUELL-ELEV-TILGANG",
    name: "elevtilgang",
    open: false,
    form: undefined,
    studentId: "",
    entraUserId: ""
  })

  let newManageManualStudentsAccessControl: NewManualAccessControl = $state({
    type: "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG",
    name: "tilgang til å administrere manuelle elever",
    open: false,
    form: undefined,
    entraUserId: ""
  })

  const closeManualAccessControl = (newManualAccessControl: NewManualAccessControl) => {
    newManualAccessControl.open = false
    newManualAccessControl.classId = ""
    newManualAccessControl.studentId = ""
    newManualAccessControl.entraUserId = ""
  }

  const addManualAccessEntry = async (newManualAccessControl: NewManualAccessControl): Promise<void> => {
    if (!newManualAccessControl.form) {
      throw new Error("Form reference is missing")
    }

    if (!newManualAccessControl.form.reportValidity()) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!newManualAccessControl.type) {
      throw new Error("Access type must be selected")
    }

    if (!newManualAccessControl.entraUserId) {
      throw new Error("Entra user ID must be selected")
    }

    // Temp override of entraUserId until issue is fixed: https://github.com/digdir/designsystemet/issues/4718
    const entraUserIdToUse = newManualAccessControl.entraUserId.substring(newManualAccessControl.entraUserId.lastIndexOf(" ") + 1)

    let accessEntryToAdd: ManualAccessEntryInput

    switch (newManualAccessControl.type) {
      case "MANUELL-KLASSE-TILGANG": {
        if (!newManualAccessControl.classId) {
          throw new Error("Class ID must be selected")
        }
        // temp override of classId until issue is fixed: https://github.com/digdir/designsystemet/issues/4718
        const classIdToUse = newManualAccessControl.classId.substring(newManualAccessControl.classId.lastIndexOf(" ") + 1)

        accessEntryToAdd = { type: newManualAccessControl.type, schoolNumber: currentSchool.schoolNumber, systemId: classIdToUse }
        break
      }
      case "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG":
        throw new Error("Manuell undervisningsområde-tilgang er ikke implementert ennå")

      case "MANUELL-ELEV-TILGANG": {
        if (!newManualAccessControl.studentId) {
          throw new Error("Student ID must be selected")
        }
        // temp override of studentId until issue is fixed: https://github.com/digdir/designsystemet/issues/4718
        const studentIdToUse = newManualAccessControl.studentId.substring(newManualAccessControl.studentId.lastIndexOf(" ") + 1)

        accessEntryToAdd = { type: newManualAccessControl.type, schoolNumber: currentSchool.schoolNumber, _id: studentIdToUse }
        break
      }

      case "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG":
        accessEntryToAdd = { type: newManualAccessControl.type, schoolNumber: currentSchool.schoolNumber }
        break

      default:
        throw new Error(`Invalid access entry type: ${newManualAccessControl.type}`)
    }

    await apiFetch(`/api/access/${entraUserIdToUse as NoSlashString}/add`, {
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

  /* --- MANUAL STUDENTS --- */

  let addManualStudentForm: HTMLFormElement | undefined = $state()
  let newManualStudentFnr = $state("")
  let newManualStudentName = $state("")
  let newManualStudentFormOpen = $state(false)

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
    newManualStudentFnr = ""
    newManualStudentName = ""
  }
</script>

{#snippet newAccess(newManualAccessControl: NewManualAccessControl)}
  <div class="new-access" style="margin-top: var(--ds-size-4)">
    {#if newManualAccessControl.open}
      <h3 class="ds-heading" data-size="xs" style="margin-top: var(--ds-size-4)">Ny {newManualAccessControl.name}</h3>
      <form bind:this={newManualAccessControl.form}>
        <ds-field class="ds-field content-item">
          <label for="{newManualAccessControl.name}-access-person" class="ds-label" data-weight="medium">Velg bruker</label>
          <ds-suggestion class="ds-suggestion">
            <input id="{newManualAccessControl.name}-access-person" class="ds-input" type="text" placeholder="" bind:value={newManualAccessControl.entraUserId} />
            <del aria-label="Tøm" hidden=""></del>
            <u-datalist>
              {#each data.appUsers as appUser}
                <u-option label="{appUser.entra.displayName} ({appUser.entra.companyName}) {appUser.entra.id}">
                  {appUser.entra.displayName}
                  <div>
                    {appUser.entra.companyName}
                  </div>
                </u-option>
              {/each}
            </u-datalist>
          </ds-suggestion>
        </ds-field>

        {#if newManualAccessControl.type === "MANUELL-KLASSE-TILGANG"}
          <ds-field class="ds-field content-item">
            <label for="{newManualAccessControl.name}-class" class="ds-label" data-weight="medium">Velg klasse</label>
            <ds-suggestion class="ds-suggestion">
              <input id="{newManualAccessControl.name}-class" class="ds-input" type="text" placeholder="" bind:value={newManualAccessControl.classId}/>
              <del aria-label="Tøm" hidden=""></del>
              <u-datalist>
                {#each schoolClasses as classInfo}
                  <u-option label="{classInfo.name} {classInfo.systemId}">
                    {classInfo.name}
                  </u-option>
                {/each}
              </u-datalist>
            </ds-suggestion>
          </ds-field>
        {/if}

        {#if newManualAccessControl.type === "MANUELL-ELEV-TILGANG"}
          <ds-field class="ds-field content-item">
            <label for="{newManualAccessControl.name}-student" class="ds-label" data-weight="medium">Velg elev</label>
            <ds-suggestion class="ds-suggestion">
              <input id="{newManualAccessControl.name}-student" class="ds-input" type="text" placeholder="" bind:value={newManualAccessControl.studentId}/>
              <del aria-label="Tøm" hidden=""></del>
              <u-datalist>
                {#each schoolStudents.sort((a, b) => a.name.localeCompare(b.name)) as student}
                  <u-option label="{student.name} {student._id}">
                    {student.name}
                  </u-option>
                {/each}
              </u-datalist>
            </ds-suggestion>
          </ds-field>
        {/if}

        <div class="new-manual-access-actions">
          <AsyncButton onClick={() => addManualAccessEntry(newManualAccessControl)} reloadPageDataOnSuccess={true} buttonText="Legg til tilgang"  iconName="add" callBackAfterReloadPageData={() => { newManualAccessControl.classId = ""; newManualAccessControl.studentId = ""; }} />

          <button class="ds-button" type="button" data-variant="secondary" onclick={() => closeManualAccessControl(newManualAccessControl)}>
            <span class="material-symbols-outlined">close</span>Lukk
          </button>
        </div>
      </form>
    {:else}
      <button class="ds-button" type="button" data-variant="secondary" onclick={() => newManualAccessControl.open = true}>
        <span class="material-symbols-outlined">add</span>Ny {newManualAccessControl.name}
      </button>
    {/if}
  </div>
{/snippet}


<div class="page-content">
  <PageHeader title={`Skoleadministrasjon - ${currentSchool.name}`} />

  <ds-tabs class="ds-tabs">
    <ds-tablist>
      {#if canManageAccess}
      <ds-tab aria-selected={selectedTab === undefined || selectedTab === accessTab}>
        Tilgangsstyring
      </ds-tab>
      {/if}
      {#if canManageManualStudents}
        <ds-tab aria-selected={selectedTab === manualStudentsTab || !canManageAccess}>
          Manuelle elever
        </ds-tab>
      {/if}
    </ds-tablist>

    {#if canManageAccess}
      <ds-tabpanel>
        <div class="ds-alert" data-color="info">Tilganger for lærere styres i InSchool, her skal det kun administreres manuelle tilganger.</div>

        <div class="access-group">
          <h2 class="ds-heading">Programområdetilganger</h2>
          <p class="ds-paragraph">Kommer etterhvert...</p>
        </div>

        <div class="access-group">
          <h2 class="ds-heading">Klassetilganger</h2>
          {#if classAccessEntries.length > 0}
            <table class="ds-table" style="table-layout:fixed">
              <thead>
                <tr>
                  <th aria-sort={classAccessEntriesSort.column === "klasse" ? classAccessEntriesSort.direction : "none"}>
                    <button type="button" onclick={() => toggleSort(classAccessEntriesSort, "klasse")}>Klasse</button>
                  </th>
                  <th aria-sort={classAccessEntriesSort.column === "bruker" ? classAccessEntriesSort.direction : "none"}>
                    <button type="button" onclick={() => toggleSort(classAccessEntriesSort, "bruker")}>Bruker</button>
                  </th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                {#each classAccessEntries as classAccess}
                    <tr>
                    <td>{classAccess.className}</td>
                    <td>{classAccess.entraUser.name} ({classAccess.entraUser.companyName})</td>
                    <td>
                      <AsyncButton onClick={() => removeManualAccessEntry(classAccess.entraUser.id, classAccess.accessEntry)} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="cancel" variant="secondary" color="danger" dataSize="sm" />
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="ds-paragraph">Ingen manuelle klassetilganger</p>
          {/if}

          {@render newAccess(newClassAccessControl)}
        </div>

        <div class="access-group">
          <h2 class="ds-heading">Direkte elevtilganger</h2>
          {#if studentAccessEntries.length > 0}
            <table class="ds-table" style="table-layout:fixed">
              <thead>
                <tr>
                  <th aria-sort={studentAccessEntriesSort.column === "elev" ? studentAccessEntriesSort.direction : "none"}>
                    <button type="button" onclick={() => toggleSort(studentAccessEntriesSort, "elev")}>Elev</button>
                  </th>
                  <th aria-sort={studentAccessEntriesSort.column === "bruker" ? studentAccessEntriesSort.direction : "none"}>
                    <button type="button" onclick={() => toggleSort(studentAccessEntriesSort, "bruker")}>Bruker</button>
                  </th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                {#each studentAccessEntries as studentAccess}
                    <tr>
                    <td>{studentAccess.student.name} ({studentAccess.student.feideName})</td>
                    <td>{studentAccess.entraUser.name} ({studentAccess.entraUser.companyName})</td>
                    <td>
                      <AsyncButton onClick={() => removeManualAccessEntry(studentAccess.entraUser.id, studentAccess.accessEntry)} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="cancel" variant="secondary" color="danger" dataSize="sm" />
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="ds-paragraph">Ingen direkte elevtilganger</p>
          {/if}

          {@render newAccess(newStudentAccessControl)}
        </div>

        <div class="access-group">
          <h2 class="ds-heading">Tilgang til å administrere manuelle elever</h2>
          {#if manageManualStudentsAccessEntries.length > 0}
            <table class="ds-table" style="table-layout:fixed">
              <thead>
                <tr>
                  <th aria-sort={manageManualStudentsAccessEntriesSort.column === "bruker" ? manageManualStudentsAccessEntriesSort.direction : "none"}>
                    <button type="button" onclick={() => toggleSort(manageManualStudentsAccessEntriesSort, "bruker")}>Bruker</button>
                  </th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                {#each manageManualStudentsAccessEntries as manualStudentsAccess}
                    <tr>
                    <td>
                      {manualStudentsAccess.entraUser.name} ({manualStudentsAccess.entraUser.companyName})
                    </td>
                    <td>
                      <AsyncButton onClick={() => removeManualAccessEntry(manualStudentsAccess.entraUser.id, manualStudentsAccess.accessEntry)} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="cancel" variant="secondary" color="danger" dataSize="sm" />
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="ds-paragraph">Ingen tilganger til å administrere manuelle elever</p>
          {/if}

          {@render newAccess(newManageManualStudentsAccessControl)}
        </div>

        <div class="new-access">

        </div>
      </ds-tabpanel>
    {/if}

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
              <AsyncButton onClick={addNewManualStudent} reloadPageDataOnSuccess={true} buttonText="Legg til ny manuell elev" iconName="add" callBackAfterReloadPageData={closeNewManualStudentForm} />
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
  .access-group {
    margin: var(--ds-size-8) 0;
  }

  .access-group h2 {
    margin-bottom: var(--ds-size-2);
  }

  .ds-suggestion, .ds-label {
    max-width: 20rem;
  }

  .new-manual-access-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: var(--ds-size-4);
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
