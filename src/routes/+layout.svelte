<script lang="ts">
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
  import type { DocumentTemplateFilterOption, FrontendOverviewStudent, FrontendOverviewStudentFilter } from "$lib/types/app-types.js"
  import type { StudentCheckBox } from "$lib/types/db/shared-types.js"
  import { prettifyDateTime } from "$lib/utils/dates.js"
  import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"
  import type { LayoutProps } from "./$types.js"

  let { data, children }: LayoutProps = $props()

  let studentFilterDialog: HTMLDialogElement | undefined = $state()
  let templateFilterDialog: HTMLDialogElement | undefined = $state()

  let showStudentOverview = $derived(page.route.id === "/")

  let studentsQuickViewAvailable = $derived(page.route.id === "/students/[student_id]")
  let showStudentsQuickView = $state(false)

  // svelte-ignore state_referenced_locally - det går bra så lenge ikke system admin kødder med checkboxene, da kan de bare refresh sida
  const enabledStudentCheckBoxes: StudentCheckBox[] = data.studentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.enabled)
  const followUpStudentCheckBoxes: StudentCheckBox[] = enabledStudentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.type === "FOLLOW_UP")
  const facilitationStudentCheckBoxes: StudentCheckBox[] = enabledStudentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.type === "FACILITATION")

  // svelte-ignore state_referenced_locally - det går bra så lenge ikke system admin kødder med document template filter options, da kan de bare refresh sida
  const studentDocumentTemplates: DocumentTemplateFilterOption[] = data.documentTemplateFilterOptions

  let selectedFollowUpStudentCheckBoxes: string[] = $state([])
  let selectedFacilitationStudentCheckBoxes: string[] = $state([])
  let selectedTemplateIds: string[] = $state([])
  let hasNoDocuments: boolean = $state(false)

  let appliedFollowUpStudentCheckBoxes: string[] = $state([])
  let appliedFacilitationStudentCheckBoxes: string[] = $state([])
  let appliedTemplateIds: string[] = $state([])
  let appliedHasNoDocuments: boolean = $state(false)

  function hasTheSameItems(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) {
      return false
    }
    const set2 = new Set(arr2)
    return arr1.every((item) => set2.has(item))
  }

  const hasCheckboxFilterChanges: boolean = $derived.by(() => {
    return !hasTheSameItems(selectedFollowUpStudentCheckBoxes, appliedFollowUpStudentCheckBoxes) || !hasTheSameItems(selectedFacilitationStudentCheckBoxes, appliedFacilitationStudentCheckBoxes)
  })

  const hasDocumentFilterChanges: boolean = $derived.by(() => {
    if (!hasTheSameItems(selectedTemplateIds, appliedTemplateIds)) {
      return true
    }

    return hasNoDocuments !== appliedHasNoDocuments
  })

  let studentOverviewFilter: FrontendOverviewStudentFilter = $state({
    className: "",
    contactTeacherName: "",
    studentName: "",
    sortBy: "studentName",
    sortDirection: "ascending",
    // svelte-ignore state_referenced_locally - det går bra da denne hentes inn ved oppstart av appen og endres ALDRI
    top: data.APP_INFO.STUDENT_OVERVIEW_TOP
  })

  const getStudentCheckBox = (studentCheckBoxId: string): StudentCheckBox => {
    const studentCheckBox: StudentCheckBox | undefined = enabledStudentCheckBoxes.find((checkBox: StudentCheckBox) => checkBox._id === studentCheckBoxId)
    if (!studentCheckBox) {
      throw new Error(`No student checkbox found for ${studentCheckBoxId}`)
    }

    return studentCheckBox
  }

  const getTemplate = (templateId: string): DocumentTemplateFilterOption => {
    const template = studentDocumentTemplates.find((t: DocumentTemplateFilterOption) => t._id === templateId)
    if (!template) {
      throw new Error(`No template found for id ${templateId}`)
    }
    return template
  }

  function applyFilters(): void {
    appliedFollowUpStudentCheckBoxes = [...selectedFollowUpStudentCheckBoxes]
    appliedFacilitationStudentCheckBoxes = [...selectedFacilitationStudentCheckBoxes]
    appliedTemplateIds = [...selectedTemplateIds]
    appliedHasNoDocuments = hasNoDocuments

    updateOverviewStudents()
    studentFilterDialog?.close()
    templateFilterDialog?.close()
  }

  function clearStudentCheckboxFilters(): void {
    selectedFollowUpStudentCheckBoxes = []
    selectedFacilitationStudentCheckBoxes = []
    appliedFollowUpStudentCheckBoxes = []
    appliedFacilitationStudentCheckBoxes = []

    updateOverviewStudents()
    studentFilterDialog?.close()
  }

  function clearTemplateFilters(): void {
    selectedTemplateIds = []
    hasNoDocuments = false
    appliedTemplateIds = []
    appliedHasNoDocuments = false

    updateOverviewStudents()
    templateFilterDialog?.close()
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

  async function updateOverviewStudents(): Promise<void> {
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

    appliedFacilitationStudentCheckBoxes.forEach((id) => {
      queryParams.append("studentCheckBoxIds", id)
    })
    appliedFollowUpStudentCheckBoxes.forEach((id) => {
      queryParams.append("studentCheckBoxIds", id)
    })
    appliedTemplateIds.forEach((id) => {
      queryParams.append("templateIds", id)
    })
    if (appliedHasNoDocuments) {
      queryParams.append("hasNoDocuments", "true")
    }

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
    overviewStudents.isLoading = true

    debounceTimer = setTimeout(() => {
      updateOverviewStudents()
    }, 300)
  }

  // Instant load on sort change and on mount
  $effect(() => {
    const _sorting = studentOverviewFilter.sortBy ? { sortBy: studentOverviewFilter.sortBy, sortDirection: studentOverviewFilter.sortDirection } : undefined
    void _sorting // read to register reactive dependency before untrack()

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
        <div class="student-search-and-filter-container">
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
            <div class="student-filters-content">
              <button
                disabled={facilitationStudentCheckBoxes.length === 0 && followUpStudentCheckBoxes.length === 0}
                class="ds-button"
                data-variant="secondary"
                type="button"
                command="show-modal"
                commandfor="student-filters-dialog"
                aria-label="Elevfilter"
                data-tooltip="Elevfilter"
                data-placement="top"
                data-autoplacement="true"
              >
                <span class="material-symbols-outlined">filter_list</span>
              </button>

              <dialog bind:this={studentFilterDialog} class="ds-dialog filters-dialog" data-placement="center" data-modal="true" id="student-filters-dialog">
                <button
                  class="ds-button"
                  data-icon="true"
                  commandfor="student-filters-dialog"
                  data-variant="tertiary"
                  type="button"
                  aria-label="Lukk dialogvindu"
                  data-color="neutral"
                  command="close"
                ></button>
                <div class="ds-dialog__block filters-dialog-content">
                  <div class="student-filters">
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
                      </div>
                    {/if}
                  </div>
                </div>
                <div class="ds-dialog__block filters-dialog-footer-block">
                  <div class="filters-footer">
                    <button
                      class="ds-button"
                      commandfor="student-filters-dialog"
                      data-variant="tertiary"
                      type="button"
                      command="close"
                      data-size="sm"
                      onclick={clearStudentCheckboxFilters}
                      disabled={selectedFollowUpStudentCheckBoxes.length === 0 && selectedFacilitationStudentCheckBoxes.length === 0}
                    >Fjern alle filter</button>
                    <button
                      class="ds-button"
                      commandfor="student-filters-dialog"
                      data-variant="primary"
                      type="button"
                      data-size="sm"
                      onclick={applyFilters}
                      disabled={!hasCheckboxFilterChanges}
                    >
                      <span class="material-symbols-outlined">check</span>
                      Bruk filter
                    </button>
                  </div>
                </div>
              </dialog>

              <button
                class="ds-button"
                data-variant="secondary"
                type="button"
                command="show-modal"
                commandfor="document-filters-action-dialog"
                aria-label="Notatfilter"
                data-tooltip="Notatfilter"
                data-placement="top"
                data-autoplacement="true"
              >
                <span class="material-symbols-outlined">description</span>
              </button>

              <dialog bind:this={templateFilterDialog} class="ds-dialog filters-dialog" data-placement="center" data-modal="true" id="document-filters-action-dialog">
                <button
                  class="ds-button"
                  data-icon="true"
                  commandfor="document-filters-action-dialog"
                  data-variant="tertiary"
                  type="button"
                  aria-label="Lukk dialogvindu"
                  data-color="neutral"
                  command="close"
                ></button>
                <div class="ds-dialog__block filters-dialog-content">
                  <div class="document-filters-templates">
                    <h2 class="ds-heading">Notat-typer</h2>
                    <hr class="ds-divider" />
                    <ul class="ds-list">
                      <li>
                        <ds-field class="ds-field">
                          <input id="document-filters-no-documents" bind:checked={hasNoDocuments} onclick={() => { selectedTemplateIds = [] }} class="ds-input" type="checkbox" />
                          <label for="document-filters-no-documents" class="ds-label" data-weight="regular">Har ingen notater</label>
                        </ds-field>
                      </li>
                    </ul>
                    <hr class="ds-divider" />
                    <ul class="ds-list">
                      {#each studentDocumentTemplates as template}
                        <li>
                          <ds-field class="ds-field">
                            <input id="document-filters-{template._id}" bind:group={selectedTemplateIds} onclick={() => { hasNoDocuments = false }} class="ds-input" type="checkbox" value={template._id} />
                            <label for="document-filters-{template._id}" class="ds-label" data-weight="regular">{template.name}</label>
                          </ds-field>
                        </li>
                      {/each}
                    </ul>
                  </div>
                </div>
                <div class="ds-dialog__block filters-dialog-footer-block">
                  <div class="filters-footer">
                    <button
                      class="ds-button"
                      commandfor="document-filters-action-dialog"
                      data-variant="tertiary"
                      type="button"
                      command="close"
                      data-size="sm"
                      onclick={clearTemplateFilters}
                      disabled={selectedTemplateIds.length === 0 && !hasNoDocuments}
                    >Fjern alle filter</button>
                    <button
                      class="ds-button"
                      commandfor="document-filters-action-dialog"
                      data-variant="primary"
                      type="button"
                      data-size="sm"
                      onclick={applyFilters}
                      disabled={!hasDocumentFilterChanges}
                    >
                      <span class="material-symbols-outlined">check</span>
                      Bruk filter
                    </button>
                  </div>
                </div>
              </dialog>
            </div>
          </div>
        </div>

        <div class="student-filters-selected">
          {#each appliedFollowUpStudentCheckBoxes.map(getStudentCheckBox) as selectedFollowUpStudentCheckBox}
            <span class="ds-tag filter-tag" data-variant="outline" data-color="brand1">
              <span class="material-symbols-outlined">filter_list</span>
              {selectedFollowUpStudentCheckBox.value}
            </span>
          {/each}
          {#each appliedFacilitationStudentCheckBoxes.map(getStudentCheckBox) as selectedFacilitationStudentCheckBox}
            <span class="ds-tag filter-tag" data-variant="outline" data-color="brand2">
              <span class="material-symbols-outlined">filter_list</span>
              {selectedFacilitationStudentCheckBox.value}
            </span>
          {/each}
          {#each appliedTemplateIds.map(getTemplate) as template}
            <span class="ds-tag filter-tag" data-variant="outline" data-color="brand3">
              <span class="material-symbols-outlined">description</span>
              {template.name}
            </span>
          {/each}
          {#if appliedHasNoDocuments}
            <span class="ds-tag filter-tag" data-variant="outline" data-color="neutral">
              <span class="material-symbols-outlined">description</span>
              Har ingen notater
            </span>
          {/if}
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
    {#if studentsQuickViewAvailable}
      {#if showStudentsQuickView}
        <div class="students-side-menu">
          <button class="ds-button" data-size="sm" data-variant="secondary" type="button" style="margin-bottom: var(--ds-size-2);" onclick={() => showStudentsQuickView = false}>
            <span class="material-symbols-outlined">left_panel_close</span>
            <span>Skjul elevliste</span>
          </button>
          <a class="ds-button" data-size="sm" data-variant="secondary" href="/">
            <span class="material-symbols-outlined">search</span>
            <span>Rediger elevsøket</span>
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
      {/if}
      <div class="page-content">
        {#if showStudentsQuickView}
          <button
            class="quick-view-student-open-overlay"
            aria-label="Lukk elevliste"
            onclick={() => showStudentsQuickView = false}
          ></button>
        {/if}
        {#if !showStudentsQuickView}
          <button class="ds-button" data-variant="secondary" data-size="sm" type="button" onclick={() => showStudentsQuickView = true} style="margin-bottom: var(--ds-size-4)">
            <span class="material-symbols-outlined">left_panel_open</span>
            Vis elevliste
          </button>
        {/if}

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

    .student-search-and-filter-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }

    .student-search-container {
      display: flex;
      gap: var(--ds-size-4);
      margin-bottom: var(--ds-size-8);
      flex-wrap: wrap;
    }

    .filters-dialog {
      max-width: 40%;
      max-height: 70%;
    }

    .filters-dialog > button[command="close"]:first-child {
      position: sticky;
      top: var(--dsc-dialog-icon-spacing);
      z-index: 2;
    }

    .filters-dialog-content {
      border-top: none;
    }

    .filters-dialog-footer-block {
      position: sticky;
      bottom: 0;
      z-index: 1;
      background-color: var(--ds-color-neutral-background-default);
    }

    .student-filters-container {
      margin-bottom: var(--ds-size-4);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .student-filters-content {
      display: flex;
      gap: var(--ds-size-2);
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

    .student-filters {
      display: flex;
      gap: var(--ds-size-15);
    }

    .filters-footer {
      display: flex;
      justify-content: space-between;
      gap: var(--ds-size-2);
    }

    .student-filters-selected {
      display: flex;
      gap: var(--ds-size-1) var(--ds-size-2);
      flex-wrap: wrap;
      margin-bottom: var(--ds-size-4);
    }

    .filter-tag {
      display: flex;
      gap: var(--ds-size-1);
      align-items: center;
    }

    .document-filters-templates > ul > li {
      list-style: none;
    }

    .document-filters-templates > ul {
      padding-left: var(--ds-size-2);
    }

    .quick-view-student-open-overlay {
      position: fixed;
      top: var(--header-height);
      left: 0;
      width: 100%;
      height: calc(100vh - var(--header-height));
      z-index: 3;
      background-color: rgba(0, 0, 0, 0.3);
    }

    .students-side-menu {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: fixed;
      z-index: 4;
      background-color: var(--ds-color-neutral-background-default);
      border-top: 1px solid var(--ds-color-neutral-border-subtle);
      border-right: 1px solid var(--ds-color-neutral-border-subtle);
      top: var(--header-height);
      overflow-y: auto;
      height: calc(100vh - var(--header-height));
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
    @media (min-width: 64rem) {
      .students-side-menu {
        position: sticky;
        z-index: 0;
        border-top: none;
      }
      .quick-view-student-open-overlay {
        display: none;
      }
    }
</style>