<script lang="ts">
  import favicon16 from "$lib/assets/favicon-32x32.png"
  import favicon32 from "$lib/assets/favicon-32x32.png"
  import "@digdir/designsystemet-web" // For ds to work
  import "@digdir/designsystemet-css" // for ds css to work and hot reload
  import "@digdir/designsystemet-css/theme" // defualt theme for now
  import "../style.css" // Add global css (and make it hot reload)
  import { page } from "$app/state"
  import AppHeader from "$lib/components/AppHeader.svelte"
  import type { FrontendOverviewStudent, FrontendStudentMainDetails } from "$lib/types/app-types.js"
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

  // svelte-ignore state_referenced_locally - det går bra så lenge ikke system admin kødder med checkboxene, da kan de bare refreshe sida
  const enabledStudentCheckBoxes = data.studentCheckBoxes.filter((checkbox) => checkbox.enabled)

  const studentCheckBoxFilters: Record<string, boolean> = enabledStudentCheckBoxes.reduce((acc: Record<string, boolean>, checkbox) => {
    acc[checkbox._id] = false
    return acc
  }, {})

  let filters: Record<string, boolean> = $state({
    importantInfo: false,
    followUp: false,
    facilitation: false,
    ...studentCheckBoxFilters
  })

  let searchOrFiltersActive = $derived.by(() => {
    const searchTermsActive = Object.values(searchTerms).some((term) => term.trim() !== "")
    const filtersActive = Object.values(filters).some((filter) => filter)
    return searchTermsActive || filtersActive
  })

  let sortBy = $state<"name" | "school" | "class" | "teacher" | "lastActivity">("name")
  let sortDirection = $state<"ascending" | "descending">("ascending")

  const resetFilters = () => {
    searchTerms.name = ""
    searchTerms.class = ""
    searchTerms.teacher = ""
    filters.importantInfo = false
    filters.followUp = false
    filters.facilitation = false
    enabledStudentCheckBoxes.forEach((checkbox) => {
      filters[checkbox._id] = false
    })
  }

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
        Object.keys(studentCheckBoxFilters).forEach((checkboxId: string) => {
          searchFilters[`matchesCheckbox_${checkboxId}`] =
            !filters[checkboxId] || student.importantStuff.some((importantStuff) => importantStuff.followUp.includes(checkboxId) || importantStuff.facilitation.includes(checkboxId))
        })

        const matchesName = !searchTerms.name || student.name.toLowerCase().includes(searchTerms.name.toLowerCase())
        const matchesClass = !searchTerms.class || student.mainClass?.name.toLowerCase().includes(searchTerms.class.toLowerCase()) || false
        const matchesTeacher = !searchTerms.teacher || student.mainContactTeacherGroup?.teachers.some((teacher) => teacher.name.toLowerCase().includes(searchTerms.teacher.toLowerCase())) || false

        return matchesName && matchesClass && matchesTeacher && Object.values(searchFilters).every((filter) => filter)
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
					<details class="ds-details" data-variant="default">
						<summary>Filter</summary>
						<div class="student-filters">
							<fieldset class="ds-fieldset">
								<legend class="ds-label" data-weight="semibold">Oppfølging</legend>
								{#each enabledStudentCheckBoxes.filter(checkbox => checkbox.type === "FOLLOW_UP") as followUpCheckbox}
									<ds-field class="ds-field">
										<input id={followUpCheckbox._id} class="ds-input" type="checkbox" bind:checked={filters[followUpCheckbox._id]} />
										<label for={followUpCheckbox._id} class="ds-label" data-weight="regular">{followUpCheckbox.value}</label>
									</ds-field>
								{/each}
							</fieldset>

							<fieldset class="ds-fieldset">
								<legend class="ds-label" data-weight="semibold">Tilrettelegging</legend>
								{#each enabledStudentCheckBoxes.filter(checkbox => checkbox.type === "FACILITATION") as facilitationCheckbox}
									<ds-field class="ds-field">
										<input id={facilitationCheckbox._id} class="ds-input" type="checkbox" bind:checked={filters[facilitationCheckbox._id]} />
										<label for={facilitationCheckbox._id} class="ds-label" data-weight="regular">{facilitationCheckbox.value}</label>
									</ds-field>
								{/each}
							</fieldset>
						</div>
					</details>
				</div>

				<div class="student-table-container">
					<table class="ds-table">
						<thead>
							<tr>
								<th aria-sort="{sortBy === "name" ? sortDirection : "none"}">
									<button type="button" onclick={() => sortBy === "name" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "name"}>Navn</button>
								</th>
								<th class="desktop-only" aria-sort="{sortBy === "class" ? sortDirection : "none"}">
									<button type="button" onclick={() => sortBy === "class" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "class"}>Klasse</button>
								</th>
								<th class="desktop-only" aria-sort="{sortBy === "teacher" ? sortDirection : "none"}">
									<button type="button" onclick={() => sortBy === "teacher" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "teacher"}>Kontaktlærer</button>
								</th>
								<th class="desktop-only" aria-sort="{sortBy === "lastActivity" ? sortDirection : "none"}">
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
		Hei, jeg er en footer!
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
		min-height: 100%;
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

	.student-search-container {
		display: flex;
		gap: var(--ds-size-4);
		margin-bottom: var(--ds-size-8);
		flex-wrap: wrap;
	}

	.student-filters-container {
		margin-bottom: var(--ds-size-8);
	}

	.student-filters {
		display: flex;
		gap: var(--ds-size-8);
		flex-wrap: wrap;
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