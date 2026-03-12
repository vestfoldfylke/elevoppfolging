<script lang="ts">
  import { page } from "$app/state"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import { slide } from "svelte/transition";
  import type { LayoutProps } from "./$types"

  let { data, children }: LayoutProps = $props()

  let onStudentsOverviewPage = $derived(page.route.id === "/students")

  let studentsQuickView = $state(true)
	let showFilters = $state(false)

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
  let sortDirection = $state<"asc" | "desc">("asc")

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

  let filteredStudents = $derived.by(() => {
    return data.students
      .filter((student) => {
        const searchFilters: Record<string, boolean> = {
          matchesImportantInfo: !filters.importantInfo || student.importantStuff.some((importantStuff) => importantStuff.importantInfo && importantStuff.importantInfo.trim() !== "")
        }
        Object.keys(studentCheckBoxFilters).forEach((checkboxId: string) => {
          searchFilters[`matchesCheckbox_${checkboxId}`] =
            !filters[checkboxId] || student.importantStuff.some((importantStuff) => importantStuff.followUp.includes(checkboxId) || importantStuff.facilitation.includes(checkboxId))
        })

        const matchesName = !searchTerms.name || student.name.toLowerCase().includes(searchTerms.name.toLowerCase())
        const matchesClass = !searchTerms.class || student.mainClassMembership?.classGroup?.name.toLowerCase().includes(searchTerms.class.toLowerCase()) || false
        const matchesTeacher =
          !searchTerms.teacher ||
          student.mainContactTeacherGroupMembership?.contactTeacherGroup?.teachers.some((teacher) => teacher.name.toLowerCase().includes(searchTerms.teacher.toLowerCase())) ||
          false

        return matchesName && matchesClass && matchesTeacher && Object.values(searchFilters).every((filter) => filter)
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
          case "class":
            return sortDirection === "asc"
              ? (a.mainClassMembership?.classGroup?.name || "").localeCompare(b.mainClassMembership?.classGroup?.name || "")
              : (b.mainClassMembership?.classGroup?.name || "").localeCompare(a.mainClassMembership?.classGroup?.name || "")
          case "teacher": {
            const aTeachers = a.mainContactTeacherGroupMembership?.contactTeacherGroup?.teachers.map((t) => t.name).join(", ") || ""
            const bTeachers = b.mainContactTeacherGroupMembership?.contactTeacherGroup?.teachers.map((t) => t.name).join(", ") || ""
            return sortDirection === "asc" ? aTeachers.localeCompare(bTeachers) : bTeachers.localeCompare(aTeachers)
          }
          case "lastActivity": {
            const aTimestamp = a.lastActivityTimestamp ? a.lastActivityTimestamp.getTime() : 0
            const bTimestamp = b.lastActivityTimestamp ? b.lastActivityTimestamp.getTime() : 0
            return sortDirection === "asc" ? aTimestamp - bTimestamp : bTimestamp - aTimestamp
          }
          default:
            return 0
        }
      })
  })
</script>

<!--
Hvis rett på /students, så kjører vi fullsøk
Hvis på /students/:id, så viser vi en sticky liste (egen scroll) med alle elever fra søket på venstre side, og klikkbare elever. MEN dette gjøres kun hvis skjermen er stor nok.
-->

{#if onStudentsOverviewPage}
	<div class="page-content">
		<PageHeader title="Elever" />
		<div class="student-filter-container">
			<div class="search-boxes">
				<div class="search-box">
					<label for="student-name-search">Navn</label>
					<input id="student-name-search" type="text" placeholder="Søk etter elever..." bind:value={searchTerms.name} />
				</div>
				<div class="search-box">
					<label for="student-class-search">Klasse</label>
					<input id="student-class-search" type="text" placeholder="Søk etter klasser..." bind:value={searchTerms.class} />
				</div>
				<div class="search-box">
					<label for="student-teacher-search">Kontaktlærer</label>
					<input id="student-teacher-search" type="text" placeholder="Søk etter kontaktlærere..." bind:value={searchTerms.teacher} />
				</div>
			</div>
			{#if showFilters}
				<div class="filter-boxes" transition:slide>
					<!--
					<div class="filter-box">
							<label for="important-info-checkbox">Har viktig informasjon</label>
							<input type="checkbox" id="important-info-checkbox" bind:checked={filters.importantInfo} />
					</div>
					-->
					<div class="filter-header">Oppfølging</div>
					{#each enabledStudentCheckBoxes.filter(checkbox => checkbox.type === "FOLLOW_UP") as followUpCheckbox}
						<div class="filter-box">
							<label>
								<input type="checkbox" id={followUpCheckbox._id} bind:checked={filters[followUpCheckbox._id]} />
								{followUpCheckbox.value}
							</label>
						</div>
					{/each}
					<div class="filter-header">Tilrettelegging</div>
					{#each enabledStudentCheckBoxes.filter(checkbox => checkbox.type === "FACILITATION") as facilitationCheckbox}
						<div class="filter-box">
							<label>
								<input type="checkbox" id={facilitationCheckbox._id} bind:checked={filters[facilitationCheckbox._id]} />
								{facilitationCheckbox.value}
							</label>
						</div>
					{/each}
				</div>
			{/if}
			<div class="filter-actions">
				<button onclick={() => showFilters = !showFilters}><span class="material-symbols-outlined">{showFilters ? "filter_alt_off" : "filter_alt"}</span>{showFilters ? "Skjul filter" : "Vis filter"}</button>
				<button disabled={!searchOrFiltersActive} onclick={resetFilters}><span class="material-symbols-outlined">refresh</span>Tilbakestill filtre og søk</button>
			</div>
		</div>

		<div class="search-metadata">Viser {filteredStudents.length} av {data.students.length} elever</div>

		<div class="students-container">
			<div class="student-row header">
				<div class="student-info-cell first">
					<button onclick={() => sortBy === "name" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "name"}>
						Navn
					{#if sortBy === "name"}
						<span class="material-symbols-outlined">{sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}</span>
					{/if}
					</button>
				</div>
				<div class="student-info-cell desktop-only">
					<button onclick={() => sortBy === "class" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "class"}>
						Klasse
					{#if sortBy === "class"}
						<span class="material-symbols-outlined">{sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}</span>
					{/if}
					</button>
				</div>
				<div class="student-info-cell desktop-only">
					<button onclick={() => sortBy === "teacher" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "teacher"}>
						Kontaktlærer
					{#if sortBy === "teacher"}
						<span class="material-symbols-outlined">{sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}</span>
					{/if}
					</button>
				</div>
				<div class="student-info-cell desktop-only">
					<button onclick={() => sortBy === "lastActivity" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "lastActivity"}>
						Siste aktivitet
					{#if sortBy === "lastActivity"}
						<span class="material-symbols-outlined">{sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}</span>
					{/if}
					</button>
				</div>
			</div>
			{#each filteredStudents as student}
				<div class="student-row">
					<div class="student-info-cell first">
						<a href={`/students/${student._id}`}>{student.name}</a>
					</div>
					<div class="student-info-cell desktop-only">
						<div>{student.mainClassMembership?.classGroup.name || "Ukjent klasse"}</div>
						<div class="school-name">{student.mainSchool?.name || "N/A"}</div>
					</div>
					<div class="student-info-cell desktop-only">{student.mainContactTeacherGroupMembership?.contactTeacherGroup.teachers[0]?.name || "Ingen kontaktlærer"}</div>
					<div class="student-info-cell desktop-only">{student.lastActivityTimestamp?.toLocaleString("no-NB", { dateStyle: 'short', timeStyle: 'short' }) || "Ingen aktivitet"}</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

{#if !onStudentsOverviewPage}
	<div class="students-and-details">
		{#if studentsQuickView}
			<div class="students-quick-view desktop-only" style="visibility: hidden;">
				<div class="student-row">
					<div class="student-info-cell first">
						&nbsp;
					</div>
				</div>
			</div>
			<div class="students-quick-view fixed desktop-only">
				<div class="students-quick-view-header">
					Hurtigtilgang
				</div>
				<div class="students-quick-view-actions">
					<a href="/students"><span class="material-symbols-outlined">arrow_back</span>Rediger filter</a>
				</div>
				{#each filteredStudents as student}
					<div class="student-row" class:active={page.url.pathname === `/students/${student._id}`}>
						<div class="student-info-cell first">
							<a href={`/students/${student._id}`}>{student.name}</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}
		<div class="student-details" class:hidden={page.route.id === "/students"}>
			{#if children}
				{@render children()}
			{:else}
				<p>fallback content</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.student-filter-container {
		display: flex;
		flex-direction: column;
		margin-bottom: 1rem;
	}
	.student-filter-container > div {
		margin: 0.5rem 0;
	}
	.search-boxes {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.search-box {
		display: flex;
		flex-direction: column;
	}

	.filter-header {
		font-weight: bold;
		margin: 0.5rem 0;
	}
	.filter-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.search-metadata {
		text-align: right;
		font-size: 0.875rem;
	}

	.students-and-details {
		display: flex;
	}
	.students-container, .students-quick-view {
		display: flex;
		flex-direction: column;
	}

	.students-quick-view {
		background-color: var(--color-primary-10);
	}

	.students-quick-view.fixed {
		position: fixed;
		height: 100vh;
		overflow: auto;
	}

	.students-quick-view-header {
		height: var(--header-height);
		display: flex;
		padding: 0rem 1rem;
		flex-direction: column;
		justify-content: center;
		font-weight: bold;
	}

	.students-quick-view-actions {
		padding: 1rem;
	}

	.student-details {
		flex: 1;
	}
	.student-details.hidden {
		display: none;
	}

	.student-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.5rem 0rem;
		align-items: center;
	}

	.students-container .student-row:nth-child(even) {
		background-color: var(--color-primary-10);
	}
	.student-row.active {
		border: 2px solid var(--color-secondary);
	}
	.student-row.header {
		padding: 0;
		font-weight: bold;
		border-top: 2px solid var(--color-primary-30);
		border-bottom: 2px solid var(--color-primary-30);
	}
	.student-row.header button {
		width: 100%;
		border: none;
	}
	.student-row.header button span {
		font-size: 1rem;
	}
	.student-info-cell {
		width: 12rem;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
	}
	.student-row.header .student-info-cell.first {
		width: 13rem;
		padding-left: 0;
	}
	.student-info-cell.first {
		padding-left: 1rem;
	}
	.desktop-only {
		display: none;
	}
	.school-name {
		font-size: 0.875rem;
	}

	@media (min-width: 50rem) {
		.desktop-only {
			display: flex;
		}
	}
</style>
