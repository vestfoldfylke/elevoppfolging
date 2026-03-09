<script lang="ts">
  import { page } from "$app/state"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import type { LayoutProps } from "./$types"

  let { data, children }: LayoutProps = $props()

  let onStudentsOverviewPage = $derived(page.route.id === "/students")

  let studentsQuickView = $state(true)

  let searchTerms = $state({
    name: "",
    class: "",
    teacher: ""
  })

  let filters = $state({
    importantInfo: false,
    followUp: false,
    facilitation: false
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
  }

  let filteredStudents = $derived.by(() => {
    return data.students
      .filter((student) => {
        const searchFilters = {
          matchesImportantInfo: !filters.importantInfo || student.importantStuff?.importantInfo,
          matchesFollowUp: !filters.followUp || (student.importantStuff?.followUp && student.importantStuff.followUp.length > 0),
          matchesFacilitation: !filters.facilitation || (student.importantStuff?.facilitation && student.importantStuff.facilitation.length > 0)
        }

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
          case "school":
            return sortDirection === "asc"
              ? (a.mainSchool?.name || "").localeCompare(b.mainSchool?.name || "")
              : (b.mainSchool?.name || "").localeCompare(a.mainSchool?.name || "")
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
            const aTimestamp = a.importantStuff?.lastActivityTimestamp ? a.importantStuff.lastActivityTimestamp.getTime() : 0
            const bTimestamp = b.importantStuff?.lastActivityTimestamp ? b.importantStuff.lastActivityTimestamp.getTime() : 0
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
			<div class="filter-boxes">
				<div class="filter-box">
						<label for="important-info-checkbox">Har viktig informasjon</label>
						<input type="checkbox" id="important-info-checkbox" bind:checked={filters.importantInfo} />
				</div>
				<div class="filter-box">
						<label for="follow-up-checkbox">Oppfølging</label>
						<input type="checkbox" id="follow-up-checkbox" bind:checked={filters.followUp} />
				</div>
				<div class="filter-box">
						<label for="facilitation-checkbox">Tilrettelegging</label>
						<input type="checkbox" id="facilitation-checkbox" bind:checked={filters.facilitation} />
				</div>
				<div class="filter-box">
						<label for="noe">Hva mer trengs her?</label>
						<input disabled type="checkbox" id="noe" />
				</div>
			</div>
			<div class="filter-actions">
				<button onclick={resetFilters}>Tilbakestill filtre og søk</button>
			</div>
		</div>

		<p>{filteredStudents.length} elever her nu gitt</p>

		<div class="students-container">
			<!--
			<div class="student-row header">
				<div class="student-info-cell">
					<button onclick={() => sortBy === "name" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "name"}>Navn</button>
				</div>
				<div class="student-info-cell">
					<button onclick={() => sortBy === "class" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "class"}>Klasse</button>
				</div>
				<div class="student-info-cell">
					<button onclick={() => sortBy === "school" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "school"}>Skole</button>
				</div>
				<div class="student-info-cell">
					<button onclick={() => sortBy === "teacher" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "teacher"}>Kontaktlærer</button>
				</div>
				<div class="student-info-cell">
					<button onclick={() => sortBy === "lastActivity" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "lastActivity"}>Siste aktivitet</button>
				</div>
			</div>
			-->
			<div>
				Elever
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
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.search-boxes {
		display: flex;
		gap: 1rem;
	}
	.search-box {
		display: flex;
		flex-direction: column;
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
	.students-container .student-row:nth-child(odd) {
		background-color: var(--color-primary-10);
	}
	.student-row.active {
		border: 2px solid var(--color-secondary);
	}
	.student-row.header {
		font-weight: bold;
		border-bottom: 2px solid #000;
	}
	.student-info-cell {
		width: 12rem;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 0rem 0.25rem;
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
