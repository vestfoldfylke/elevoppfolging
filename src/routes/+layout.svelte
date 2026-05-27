<script lang="ts">
  import { env } from "$env/dynamic/public"
  import favicon16 from "$lib/assets/favicon-32x32.png"
  import favicon32 from "$lib/assets/favicon-32x32.png"
  import "@digdir/designsystemet-web" // For ds to work
  import "@digdir/designsystemet-css" // for ds css to work and hot reload
  import "@digdir/designsystemet-css/theme" // default theme for now
  import "../style.css" // Add global css (and make it hot reload)
  import { untrack } from "svelte"
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch.js"
  import AppHeader from "$lib/components/AppHeader.svelte"
  import ScreenSaver from "$lib/components/ScreenSaver.svelte"
  import type { NoSlashString } from "$lib/types/api/api-route-map.js"
  import type { FrontendOverviewStudent, FrontendOverviewStudentFilter } from "$lib/types/app-types.js"
  import type { StudentCheckBox } from "$lib/types/db/shared-types.js"
  import { prettifyDateTime } from "$lib/utils/dates.js"
  import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"
  import type { LayoutProps } from "./$types.js"

  let { data, children }: LayoutProps = $props()

  let showStudentOverview = $derived(page.route.id === "/")

  let studentsQuickViewAvailable = $derived(page.route.id === "/students/[student_id]")
  let showStudentsQuickView = $state(true)

  // svelte-ignore state_referenced_locally - det går bra så lenge ikke system admin kødder med checkboxene, da kan de bare refresh sida
  const enabledStudentCheckBoxes: StudentCheckBox[] = data.studentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.enabled)
  const followUpStudentCheckBoxes: StudentCheckBox[] = enabledStudentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.type === "FOLLOW_UP")
  const facilitationStudentCheckBoxes: StudentCheckBox[] = enabledStudentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.type === "FACILITATION")

  let selectedFollowUpStudentCheckBoxes: string[] = $state([])
  let selectedFacilitationStudentCheckBoxes: string[] = $state([])

  let studentOverviewFilter: FrontendOverviewStudentFilter = $state({
    className: "",
    contactTeacherName: "",
    studentName: "",
    sortBy: "studentName",
    sortDirection: "ascending",
    top: (env.PUBLIC_STUDENT_OVERVIEW_TOP && Number.parseInt(env.PUBLIC_STUDENT_OVERVIEW_TOP, 10)) || 100
  })

  const getStudentCheckBox = (studentCheckBoxId: string): StudentCheckBox => {
    const studentCheckBox: StudentCheckBox | undefined = enabledStudentCheckBoxes.find((checkBox: StudentCheckBox) => checkBox._id === studentCheckBoxId)
    if (!studentCheckBox) {
      throw new Error(`No student checkbox found for ${studentCheckBoxId}`)
    }

    return studentCheckBox
  }

  const removeFollowUpStudentCheckBoxFilter = (studentCheckBoxId: string): void => {
    if (!selectedFollowUpStudentCheckBoxes.includes(studentCheckBoxId)) {
      throw new Error("Trying to remove document filter that is not selected, something wrong here gitt")
    }

    selectedFollowUpStudentCheckBoxes = selectedFollowUpStudentCheckBoxes.filter((id: string) => id !== studentCheckBoxId)
  }

  const removeFacilitationStudentCheckBoxFilter = (studentCheckBoxId: string): void => {
    if (!selectedFacilitationStudentCheckBoxes.includes(studentCheckBoxId)) {
      throw new Error("Trying to remove document filter that is not selected, something wrong here gitt")
    }

    selectedFacilitationStudentCheckBoxes = selectedFacilitationStudentCheckBoxes.filter((id: string) => id !== studentCheckBoxId)
  }

  type OverviewStudentsState = {
    isLoading: boolean
    errorMessage: string | null
    students: FrontendOverviewStudent[]
    totalStudentCount: number
  }

  let overviewStudents: OverviewStudentsState = $state({
    isLoading: false,
    errorMessage: null,
    students: [],
    totalStudentCount: 0
  })

  const updateOverviewStudents = async (): Promise<void> => {
    overviewStudents.isLoading = true
    overviewStudents.errorMessage = null

    const queryParams = new URLSearchParams()
    if (studentOverviewFilter.studentName) {
      queryParams.append("studentName", studentOverviewFilter.studentName)
    }
    if (studentOverviewFilter.className) {
      queryParams.append("className", studentOverviewFilter.className)
    }
    if (studentOverviewFilter.contactTeacherName) {
      queryParams.append("contactTeacherName", studentOverviewFilter.contactTeacherName)
    }

    selectedFacilitationStudentCheckBoxes.forEach((id) => {
      queryParams.append("studentCheckBoxIds", id)
    })
    selectedFollowUpStudentCheckBoxes.forEach((id) => {
      queryParams.append("studentCheckBoxIds", id)
    })

    if (studentOverviewFilter.sortBy) {
      queryParams.append("sortBy", studentOverviewFilter.sortBy)
    }
    if (studentOverviewFilter.sortDirection) {
      queryParams.append("sortDirection", studentOverviewFilter.sortDirection)
    }
    if (studentOverviewFilter.top) {
      queryParams.append("top", studentOverviewFilter.top.toString()) // For nå, hardkode til 100
    }

    const queryString = `?${queryParams.toString()}` as NoSlashString

    try {
      const studentsResponse = await apiFetch(`/api/students${queryString}`, {
        method: "GET"
      })

      overviewStudents.students = studentsResponse.students
      overviewStudents.totalStudentCount = studentsResponse.totalStudentCount
    } catch (error) {
      console.error("Error fetching students:", error)
      overviewStudents.errorMessage = `Det skjedde en feil ved innlasting av elever. Feilmelding: ${error instanceof Error ? error.message : "Ukjent feil"}`
    }

    overviewStudents.isLoading = false
  }

  let debounceTimer: NodeJS.Timeout

  const debouncedUpdateOverviewStudents = (): void => {
    clearTimeout(debounceTimer)

    debounceTimer = setTimeout(() => {
      updateOverviewStudents()
    }, 300)
  }

  // Instant load on checkbox-filters, sorting and on mount
  $effect(() => {
    const _studentCheckBoxIds = [...selectedFacilitationStudentCheckBoxes, ...selectedFollowUpStudentCheckBoxes]
    const _sorting = studentOverviewFilter.sortBy ? { sortBy: studentOverviewFilter.sortBy, sortDirection: studentOverviewFilter.sortDirection } : undefined
    void _studentCheckBoxIds // read to register reactive dependency before untrack() - this line is here only to silence the warning about unused constant
    void _sorting // read to register reactive dependency before untrack() - this line is here only to silence the warning about unused constant

    untrack(() => {
      updateOverviewStudents()
    })
  })
</script>

<svelte:head>
  <title>Elevoppfølging</title>
  <link rel="icon" type="image/png" sizes="32x32" href={favicon32}>
  <link rel="icon" type="image/png" sizes="16x16" href={favicon16}>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  <style>
      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
  </style>
</svelte:head>


<div id="svelte-body">
  <header>
    <AppHeader />
  </header>

  <ScreenSaver />

  <main>
    {#if showStudentOverview}
      <div class="page-content">
        <h1 class="ds-heading" data-size="lg">Elever</h1>
        <div class="student-search-container">
          <ds-field class="ds-field">
            <label for="student-name-search" class="ds-label" data-weight="medium">Navn</label>
            <input id="student-name-search" class="ds-input" type="text" placeholder="Søk etter elev" bind:value={studentOverviewFilter.studentName} oninput={debouncedUpdateOverviewStudents} autocomplete="off" >
          </ds-field>
          <ds-field class="ds-field">
            <label for="student-class-search" class="ds-label" data-weight="medium">Klasse</label>
            <input id="student-class-search" class="ds-input" placeholder="Søk etter klasse" type="text" bind:value={studentOverviewFilter.className} oninput={debouncedUpdateOverviewStudents} autocomplete="off" />
          </ds-field>
          <ds-field class="ds-field">
            <label for="student-teacher-search" class="ds-label" data-weight="medium">Kontaktlærer</label>
            <input id="student-teacher-search" class="ds-input" placeholder="Søk etter kontaktlærer" type="text" bind:value={studentOverviewFilter.contactTeacherName} oninput={debouncedUpdateOverviewStudents} autocomplete="off" />
          </ds-field>
        </div>

        <div class="student-filters-container">
          <div class="student-filters-selected">
            {#each selectedFollowUpStudentCheckBoxes.map(getStudentCheckBox) as selectedFollowUpStudentCheckBox}
              <button class="ds-chip chip-followup" id={selectedFollowUpStudentCheckBox._id} aria-label={`Fjern ${selectedFollowUpStudentCheckBox.value}`} onclick={() => removeFollowUpStudentCheckBoxFilter(selectedFollowUpStudentCheckBox._id)} data-removable="true">{selectedFollowUpStudentCheckBox.value}</button>
            {/each}
            {#each selectedFacilitationStudentCheckBoxes.map(getStudentCheckBox) as selectedFacilitationStudentCheckBox}
              <button class="ds-chip chip-facilitation" id={selectedFacilitationStudentCheckBox._id} aria-label={`Fjern ${selectedFacilitationStudentCheckBox.value}`} onclick={() => removeFacilitationStudentCheckBoxFilter(selectedFacilitationStudentCheckBox._id)} data-removable="true">{selectedFacilitationStudentCheckBox.value}</button>
            {/each}
          </div>

          <div class="student-filters-content">
            <button
              disabled={facilitationStudentCheckBoxes.length === 0 && followUpStudentCheckBoxes.length === 0}
              class="ds-button"
              data-variant="secondary"
              type="button"
              popovertarget="student-filters-action-container"
              aria-label="Elevfilter"
              data-tooltip="Elevfilter"
              data-placement="top"
              data-autoplacement="true"
            >
              <span class="material-symbols-outlined">filter_list</span>
            </button>
            <div id="student-filters-action-container" class="ds-popover ds-dropdown" popover="auto" data-placement="bottom-end" data-variant="default">
              {#if followUpStudentCheckBoxes.length > 0}
                <div class="student-filters-followup">
                  <h2 class="ds-heading">{STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.single}</h2>
                  <hr class="ds-divider" />
                  <ul class="ds-list">
                    {#each followUpStudentCheckBoxes as followUpStudentCheckBox}
                      <li>
                        <ds-field class="ds-field">
                          <input id="student-filters-{followUpStudentCheckBox._id}" bind:group={selectedFollowUpStudentCheckBoxes} class="ds-input" type="checkbox" value={followUpStudentCheckBox._id} />
                          <label for="student-filters-{followUpStudentCheckBox._id}" class="ds-label" data-weight="regular">{followUpStudentCheckBox.value}</label>
                        </ds-field>
                      </li>
                    {/each}
                  </ul>
                  <hr class="ds-divider" />
                  <button class="ds-button" data-variant="tertiary" data-size="sm" type="button" onclick={() => selectedFollowUpStudentCheckBoxes = []} disabled={selectedFollowUpStudentCheckBoxes.length === 0}>Fjern alle filter</button>
                </div>
              {/if}
              {#if facilitationStudentCheckBoxes.length > 0}
                <div class="student-filters-facilitation">
                  <h2 class="ds-heading">{STUDENT_CHECKBOX_DISPLAY_NAMES.FACILITATION.plural}</h2>
                  <hr class="ds-divider" />
                  <ul class="ds-list">
                    {#each facilitationStudentCheckBoxes as facilitationStudentCheckBox}
                      <li>
                        <ds-field class="ds-field">
                          <input id="student-filters-{facilitationStudentCheckBox._id}" bind:group={selectedFacilitationStudentCheckBoxes} class="ds-input" type="checkbox" value={facilitationStudentCheckBox._id} />
                          <label for="student-filters-{facilitationStudentCheckBox._id}" class="ds-label" data-weight="regular">{facilitationStudentCheckBox.value}</label>
                        </ds-field>
                      </li>
                    {/each}
                  </ul>
                  <hr class="ds-divider" />
                  <button class="ds-button" data-variant="tertiary" data-size="sm" type="button" onclick={() => selectedFacilitationStudentCheckBoxes = []} disabled={selectedFacilitationStudentCheckBoxes.length === 0}>Fjern alle filter</button>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div>
					<span>
						{overviewStudents.students.length} av {overviewStudents.totalStudentCount} elever
					</span>
          <table class="ds-table" style="table-layout:fixed">
            <thead>
            <tr>
              <th aria-sort={studentOverviewFilter.sortBy === "studentName" ? studentOverviewFilter.sortDirection : "none"}>
                <button type="button" onclick={() => studentOverviewFilter.sortBy === "studentName" ? studentOverviewFilter.sortDirection = studentOverviewFilter.sortDirection === "ascending" ? "descending" : "ascending" : studentOverviewFilter.sortBy = "studentName"}>Navn</button>
              </th>
              <th class="desktop-only" aria-sort={studentOverviewFilter.sortBy === "className" ? studentOverviewFilter.sortDirection : "none"}>
                <button type="button" onclick={() => studentOverviewFilter.sortBy === "className" ? studentOverviewFilter.sortDirection = studentOverviewFilter.sortDirection === "ascending" ? "descending" : "ascending" : studentOverviewFilter.sortBy = "className"}>Klasse</button>
              </th>
              <th class="desktop-only" aria-sort={studentOverviewFilter.sortBy === "contactTeacherName" ? studentOverviewFilter.sortDirection : "none"}>
                <button type="button" onclick={() => studentOverviewFilter.sortBy === "contactTeacherName" ? studentOverviewFilter.sortDirection = studentOverviewFilter.sortDirection === "ascending" ? "descending" : "ascending" : studentOverviewFilter.sortBy = "contactTeacherName"}>Kontaktlærer</button>
              </th>
              <th class="desktop-only" aria-sort={studentOverviewFilter.sortBy === "lastActivity" ? studentOverviewFilter.sortDirection : "none"}>
                <button type="button" onclick={() => studentOverviewFilter.sortBy === "lastActivity" ? studentOverviewFilter.sortDirection = studentOverviewFilter.sortDirection === "ascending" ? "descending" : "ascending" : studentOverviewFilter.sortBy = "lastActivity"}>Siste aktivitet</button>
              </th>
            </tr>
            </thead>
            <tbody>
            {#if overviewStudents.isLoading}
              {#each new Array(10) as _item}
                <tr>
                  <td><span aria-hidden="true" class="ds-skeleton" data-variant="rectangle" style="height: 3rem;"></span></td>
                  <td class="desktop-only"><span aria-hidden="true" class="ds-skeleton" data-variant="rectangle" style="height: 3rem;"></span></td>
                  <td class="desktop-only"><span aria-hidden="true" class="ds-skeleton" data-variant="rectangle" style="height: 3rem;"></span></td>
                  <td class="desktop-only"><span aria-hidden="true" class="ds-skeleton" data-variant="rectangle" style="height: 3rem;"></span></td>
                </tr>
              {/each}
            {:else if overviewStudents.errorMessage}
              <tr>
                <td colspan="4" class="ds-text--error">{overviewStudents.errorMessage}</td>
              </tr>
            {:else if overviewStudents.students.length === 0}
              <tr>
                <td colspan="4">Ingen elever funnet</td>
              </tr>
            {:else}
              {#each overviewStudents.students as student}
                <tr>
                  <td><a class="ds-link" href={`/students/${student._id}`}>{student.name}</a></td>
                  <td class="desktop-only">{student.mainClass?.name || "Ukjent klasse"}<br/><span class="school-name">{student.mainSchool?.name || "N/A"}</span></td>
                  <td class="desktop-only">{student.mainContactTeacherGroup?.teachers[0]?.name || "Ingen kontaktlærer"}</td>
                  <td class="desktop-only">{student.lastActivityTimestamp ? prettifyDateTime(student.lastActivityTimestamp) : "Ingen aktivitet"}</td>
                </tr>
              {/each}
            {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Special case for students/id page - we need layout data from parent, so we do some nasty stuff here for side menu (quick view student) -->
    {#if studentsQuickViewAvailable && showStudentsQuickView}
      <div class="students-side-menu desktop-only">
        <a class="ds-button" data-size="sm" data-variant="secondary" href="/">
          <span class="material-symbols-outlined" aria-label="small" data-size="sm">arrow_back</span>
          <span>Rediger elevsøk</span>
        </a>
        <div class="ds-paragraph students-side-menu-heading">Elever</div>
        <ul class="students-side-menu-list">
          {#if overviewStudents.isLoading}
            <li><span aria-hidden="true" class="ds-skeleton" data-variant="rectangle" style="width:200px;height:20px"></span></li>
            <li><span aria-hidden="true" class="ds-skeleton" data-variant="rectangle" style="width:200px;height:20px"></span></li>
            <li><span aria-hidden="true" class="ds-skeleton" data-variant="rectangle" style="width:200px;height:20px"></span></li>
          {:else if overviewStudents.errorMessage}
            <li class="ds-text--error">{overviewStudents.errorMessage}</li>
          {:else if overviewStudents.students.length === 0}
            <li>Ingen elever funnet</li>
          {:else}
            {#each overviewStudents.students as student}
              <li>
                <a data-variant="default" data-size="sm" class="ds-link ds-paragraph students-side-menu-list-item-link" href={`/students/${student._id}`} class:active={page.url.pathname === `/students/${student._id}`}>{student.name}</a>
              </li>
            {/each}
          {/if}
        </ul>
      </div>
      <div class="page-content">
        {@render children()}
      </div>
    {:else}
      {@render children()}
    {/if}
  </main>

  <footer>
    Vestfold fylkeskommune
  </footer>
</div>

<style>
    #svelte-body {
        display: grid;
        grid-template-rows: auto 1fr auto;
        grid-template-areas:
			"header"
			"main"
			"footer";
        min-height: 100vh;
    }

    #svelte-body > header {
        grid-area: header;
        width: 100%;
        display: flex;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 5;
        border-bottom: 1px solid var(--ds-color-neutral-border-subtle);
        background-color: var(--ds-color-neutral-background-default);
    }

    #svelte-body > main {
        grid-area: main;
        box-sizing: border-box;
        display: flex;
        width: 100%;
        max-width: var(--max-page-width);
        margin: 0 auto;
        padding: 0 var(--ds-size-4);
    }

    #svelte-body > footer {
        grid-area: footer;
    }

    footer {
        max-width: var(--max-page-width);
        padding: var(--ds-size-4);
        margin: 0 auto;
        display: flex;
    }

    .student-search-container {
        display: flex;
        gap: var(--ds-size-4);
        margin-bottom: var(--ds-size-8);
        flex-wrap: wrap;
    }

    .student-filters-container {
        margin-bottom: var(--ds-size-4);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    #student-filters-action-container {
        --dsc-popover-max-width: 100%;
    }

    @media (max-width: 64rem) {
        .student-filters-container {
            display: none;
        }
    }

    .student-filters-followup > ul > li, .student-filters-facilitation > ul > li {
        list-style: none;
    }

    .student-filters-followup > ul, .student-filters-facilitation > ul {
        padding-left: var(--ds-size-2);
    }

    #student-filters-action-container:popover-open {
        display: flex;
    }

    .student-filters-selected {
        display: flex;
        gap: var(--ds-size-1) var(--ds-size-2);
        flex-wrap: wrap;
    }

    .chip-followup {
        background-color: var(--dsc-chip-background--checked)
    }

    .chip-facilitation {
        background-color: var(--ds-color-brand1-text-subtle);
    }

    .students-side-menu {
        box-sizing: border-box;
        display: none;
        flex-direction: column;
        position: sticky;
        border-right: 1px solid var(--ds-color-neutral-border-subtle);
        top: var(--header-height);
        overflow-y: auto;
        max-height: calc(100vh - var(--header-height));
        padding-top: var(--ds-size-7);
        padding-left: var(--ds-size-4);
        padding-right: var(--ds-size-4);
        scrollbar-color: var(--ds-color-neutral-border-subtle) transparent;
        margin-left: calc(var(--ds-size-4) * -1);
        margin-right: var(--ds-size-10);
        overscroll-behavior: contain;
    }

    .students-side-menu-list {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
        padding: 0;
    }

    .students-side-menu-list > li {
        list-style: none;
        padding: 0;
    }

    .students-side-menu-heading {
        margin-top: var(--ds-size-4);
    }

    .students-side-menu-heading, .students-side-menu-list-item-link {
        padding: var(--ds-size-1) var(--ds-size-4);
    }

    .students-side-menu-list-item-link {
        --dsc-link-background--active: var(--ds-color-neutral-surface-tinted);
        color: inherit;
        text-decoration: none;
        display: block;
        line-height: 1.3em;
        position: relative;
        border-radius: var(--ds-border-radius-md);
        text-wrap: balance;
    }

    .students-side-menu-list-item-link:hover {
        background-color: var(--ds-color-neutral-surface-tinted);
    }

    .students-side-menu-list-item-link.active {
        color: inherit;
        font-weight: 500;
        background-color: var(--ds-color-neutral-background-tinted);
        border-left: 4px solid var(--ds-color-border-default);
    }

    .desktop-only {
        display: none;
    }

    .school-name {
        font-size: 0.875rem;
    }

    @media (min-width: 64rem) {
        th.desktop-only, td.desktop-only {
            display: table-cell;
        }
    }
    @media (min-width: 80rem) {
        .students-side-menu.desktop-only {
            display: flex;
        }
    }
</style>