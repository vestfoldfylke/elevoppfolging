<script lang="ts">
  import favicon16 from "$lib/assets/favicon-32x32.png"
  import favicon32 from "$lib/assets/favicon-32x32.png"
  import "@digdir/designsystemet-web" // For ds to work
  import "@digdir/designsystemet-css" // for ds css to work and hot reload
  import "@digdir/designsystemet-css/theme" // default theme for now
  import "../style.css" // Add global css (and make it hot reload)
  import { page } from "$app/state"
  import AppHeader from "$lib/components/AppHeader.svelte"
  import type { FrontendOverviewStudent, FrontendStudentMainDetails } from "$lib/types/app-types.js"
  import type { StudentCheckBox } from "$lib/types/db/shared-types.js"
  import { getFrontendStudentMainDetails } from "$lib/utils/frontend-student-details.js"
  import type { LayoutProps } from "./$types.js"

  let { data, children }: LayoutProps = $props()

  let showStudentOverview = $derived(page.route.id === "/")

  let studentsQuickViewAvailable = $derived(page.route.id === "/students/[student_id]")
  let showStudentsQuickView = $state(true)

  let searchTerms = $state({
    name: "",
    class: "",
    teacher: ""
  })

  // svelte-ignore state_referenced_locally - det går bra så lenge ikke system admin kødder med checkboxene, da kan de bare refresh sida
  const enabledStudentCheckBoxes: StudentCheckBox[] = data.studentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.enabled)
  const followUpStudentCheckBoxes: StudentCheckBox[] = enabledStudentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.type === "FOLLOW_UP")
  const facilitationStudentCheckBoxes: StudentCheckBox[] = enabledStudentCheckBoxes.filter((checkbox: StudentCheckBox) => checkbox.type === "FACILITATION")

  let selectedFollowUpStudentCheckBoxes: string[] = $state([])
  let selectedFacilitationStudentCheckBoxes: string[] = $state([])

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

  let filters: Record<string, boolean> = $state({
    importantInfo: false,
    followUp: false,
    facilitation: false
  })

  let sortBy = $state<"name" | "class" | "teacher" | "lastActivity">("name")
  let sortDirection = $state<"ascending" | "descending">("ascending")

  let students: (FrontendOverviewStudent & FrontendStudentMainDetails)[] = $derived.by(() =>
    data.students.map((student) => {
      return {
        ...student,
        ...getFrontendStudentMainDetails(student.enrollmentsWithinViewAccessWindow)
      }
    })
  )

  let filteredStudents = $derived.by(() => {
    return students
      .filter((student) => {
        const searchFilters: Record<string, boolean> = {
          matchesImportantInfo: !filters.importantInfo || student.importantStuff.some((importantStuff) => importantStuff.importantInfo && importantStuff.importantInfo.trim() !== "")
        }
        Object.values(selectedFollowUpStudentCheckBoxes).forEach((checkboxId: string) => {
          searchFilters[`matchesCheckbox_${checkboxId}`] = student.importantStuff.some((importantStuff) => importantStuff.followUp.includes(checkboxId))
        })
        Object.values(selectedFacilitationStudentCheckBoxes).forEach((checkboxId: string) => {
          searchFilters[`matchesCheckbox_${checkboxId}`] = student.importantStuff.some((importantStuff) => importantStuff.facilitation.includes(checkboxId))
        })

        const matchesName = !searchTerms.name || student.name.toLowerCase().includes(searchTerms.name.toLowerCase())
        const matchesClass = !searchTerms.class || student.mainClass?.name.toLowerCase().includes(searchTerms.class.toLowerCase()) || false
        const matchesTeacher = !searchTerms.teacher || student.mainContactTeacherGroup?.teachers.some((teacher) => teacher.name.toLowerCase().includes(searchTerms.teacher.toLowerCase())) || false
        const searchFilterMatch = Object.values(searchFilters).every((filter) => filter)

        return matchesName && matchesClass && matchesTeacher && searchFilterMatch
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return sortDirection === "ascending" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
          case "class":
            return sortDirection === "ascending" ? (a.mainClass?.name || "").localeCompare(b.mainClass?.name || "") : (b.mainClass?.name || "").localeCompare(a.mainClass?.name || "")
          case "teacher": {
            const aTeachers = a.mainContactTeacherGroup?.teachers.map((t) => t.name).join(", ") || ""
            const bTeachers = b.mainContactTeacherGroup?.teachers.map((t) => t.name).join(", ") || ""
            return sortDirection === "ascending" ? aTeachers.localeCompare(bTeachers) : bTeachers.localeCompare(aTeachers)
          }
          case "lastActivity": {
            const aTimestamp = a.lastActivityTimestamp ? a.lastActivityTimestamp.getTime() : 0
            const bTimestamp = b.lastActivityTimestamp ? b.lastActivityTimestamp.getTime() : 0
            return sortDirection === "ascending" ? aTimestamp - bTimestamp : bTimestamp - aTimestamp
          }
          default:
            return 0
        }
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
	<main>
		{#if showStudentOverview}
			<div class="page-content">
				<h1 class="ds-heading" data-size="lg">Elever</h1>
				<div class="student-search-container">
					<ds-field class="ds-field">
						<label for="student-name-search" class="ds-label" data-weight="medium">Navn</label>
						<input id="student-name-search" class="ds-input" type="text" placeholder="Søk etter elev" bind:value={searchTerms.name} >
					</ds-field>
					<ds-field class="ds-field">
						<label for="student-class-search" class="ds-label" data-weight="medium">Klasse</label>
						<input id="student-class-search" class="ds-input" placeholder="Søk etter klasse" type="text" bind:value={searchTerms.class} />
					</ds-field>
					<ds-field class="ds-field">
						<label for="student-teacher-search" class="ds-label" data-weight="medium">Kontaktlærer</label>
						<input id="student-teacher-search" class="ds-input" placeholder="Søk etter kontaktlærer" type="text" bind:value={searchTerms.teacher} />
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
									<h2 class="ds-heading">Oppfølging</h2>
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
									<h2 class="ds-heading">Tilrettelegging</h2>
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
				</div>

				<div class="student-table-container">
					<table class="ds-table">
						<thead>
							<tr>
								<th aria-sort={sortBy === "name" ? sortDirection : "none"}>
									<button type="button" onclick={() => sortBy === "name" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "name"}>Navn</button>
								</th>
								<th class="desktop-only" aria-sort={sortBy === "class" ? sortDirection : "none"}>
									<button type="button" onclick={() => sortBy === "class" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "class"}>Klasse</button>
								</th>
								<th class="desktop-only" aria-sort={sortBy === "teacher" ? sortDirection : "none"}>
									<button type="button" onclick={() => sortBy === "teacher" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "teacher"}>Kontaktlærer</button>
								</th>
								<th class="desktop-only" aria-sort={sortBy === "lastActivity" ? sortDirection : "none"}>
									<button type="button" onclick={() => sortBy === "lastActivity" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "lastActivity"}>Siste aktivitet</button>
								</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredStudents.slice(0, 100) as student}
								<tr>
									<td><a class="ds-link" href={`/students/${student._id}`}>{student.name}</a></td>
									<td class="desktop-only">{student.mainClass?.name || "Ukjent klasse"}<br/><span class="school-name">{student.mainSchool?.name || "N/A"}</span></td>
									<td class="desktop-only">{student.mainContactTeacherGroup?.teachers[0]?.name || "Ingen kontaktlærer"}</td>
									<td class="desktop-only">{student.lastActivityTimestamp?.toLocaleString("no-NB", { dateStyle: 'short', timeStyle: 'short' }) || "Ingen aktivitet"}</td>
								</tr>
							{/each}
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
					{#each filteredStudents.slice(0, 100) as student}
						<li class:active={page.url.pathname === `/students/${student._id}`}>
							<a data-variant="default" data-size="sm" class="ds-link ds-paragraph students-side-menu-list-item-link" href={`/students/${student._id}`} class:active={page.url.pathname === `/students/${student._id}`}>{student.name}</a>
						</li>
					{/each}
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

	.student-table-container {
		display: flex;
	}

	.student-table-container table {
		flex: 1;
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