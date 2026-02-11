<script lang="ts">
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

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
        const matchesClass = !searchTerms.class || student.mainClass?.name.toLowerCase().includes(searchTerms.class.toLowerCase()) || false
        const matchesTeacher = !searchTerms.teacher || student.mainContactTeacherGroup?.teachers.some((teacher) => teacher.name.toLowerCase().includes(searchTerms.teacher.toLowerCase())) || false

        return matchesName && matchesClass && matchesTeacher && Object.values(searchFilters).every((filter) => filter)
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
          case "school":
            return sortDirection === "asc" ? (a.mainSchool?.name || "").localeCompare(b.mainSchool?.name || "") : (b.mainSchool?.name || "").localeCompare(a.mainSchool?.name || "")
          case "class":
            return sortDirection === "asc" ? (a.mainClass?.name || "").localeCompare(b.mainClass?.name || "") : (b.mainClass?.name || "").localeCompare(a.mainClass?.name || "")
          case "teacher": {
            const aTeachers = a.mainContactTeacherGroup?.teachers.map((t) => t.name).join(", ") || ""
            const bTeachers = b.mainContactTeacherGroup?.teachers.map((t) => t.name).join(", ") || ""
            return sortDirection === "asc" ? aTeachers.localeCompare(bTeachers) : bTeachers.localeCompare(aTeachers)
          }
          case "lastActivity": {
            const aTimestamp = a.importantStuff?.lastActivityTimestamp ? new Date(a.importantStuff.lastActivityTimestamp).getTime() : 0
            const bTimestamp = b.importantStuff?.lastActivityTimestamp ? new Date(b.importantStuff.lastActivityTimestamp).getTime() : 0
            return sortDirection === "asc" ? aTimestamp - bTimestamp : bTimestamp - aTimestamp
          }
          default:
            return 0
        }
      })
  })
</script>

<h1>Elever</h1>
<div class="student-filter-container">
	<div class="search-boxes">
		<div class="search-box">
			<label for="student-name-search">Navn:</label>
			<input id="student-name-search" type="text" placeholder="Søk etter elever..." bind:value={searchTerms.name} />
		</div>
		<div class="search-box">
			<label for="student-class-search">Klasse:</label>
			<input id="student-class-search" type="text" placeholder="Søk etter klasser..." bind:value={searchTerms.class} />
		</div>
		<div class="search-box">
			<label for="student-teacher-search">Kontaktlærer:</label>
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
	<div class="student-row header">
		<div class="student-cell">
			<!-- TODO create function for sorting... -->
			<button onclick={() => sortBy === "name" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "name"}>Navn</button>
		</div>
		<div class="student-cell">
			<button onclick={() => sortBy === "school" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "school"}>Skole</button>
		</div>
		<div class="student-cell">
			<button onclick={() => sortBy === "class" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "class"}>Klasse</button>
		</div>
		<div class="student-cell">
			<button onclick={() => sortBy === "teacher" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "teacher"}>Kontaktlærer</button>
		</div>
		<div class="student-cell">
			<button onclick={() => sortBy === "lastActivity" ? sortDirection = sortDirection === "asc" ? "desc" : "asc" : sortBy = "lastActivity"}>Siste aktivitet</button>
		</div>
	</div>
	{#each filteredStudents as student}
		<div class="student-row">
			<div class="student-cell"><a href={`/students/${student._id}`}>{student.name}</a></div>
			<div class="student-cell">{student.mainSchool?.name || "N/A"}</div>
			<div class="student-cell">{student.mainClass?.name || "N/A"}</div>
			<div class="student-cell">{student.mainContactTeacherGroup?.teachers.map((teacher) => teacher.name).join(", ") || "N/A"}</div>
			<div class="student-cell">{student.importantStuff?.lastActivityTimestamp || "Ingen aktivitet"}</div>
		</div>
	{/each}
</div>

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

	.students-container {
		display: flex;
		flex-direction: column;
	}
	.student-row {
		flex: 1;
		display: flex;
		padding: 0.5rem 0rem;
		align-items: center;
	}
	.student-row.header {
		font-weight: bold;
		border-bottom: 2px solid #000;
	}
	.student-cell {
		width: 15rem;
		flex-shrink: 0;
	}
</style>
