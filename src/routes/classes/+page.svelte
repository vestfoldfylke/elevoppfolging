<script lang="ts">
  import type { StudentClassGroup, Teacher } from "$lib/types/db/shared-types"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let searchTerms = $state({
    class: "",
    school: "",
    teacher: ""
  })

  let sortBy = $state<"class" | "school" | "teacher">("class")
  let sortDirection = $state<"ascending" | "descending">("ascending")

  let classes: StudentClassGroup[] = $derived.by(() => data.classes)

  let filteredClasses = $derived.by(() => {
    return classes
      .filter((classEntry: StudentClassGroup) => {
        const matchesClass = !searchTerms.class || classEntry.name.toLowerCase().includes(searchTerms.class.toLowerCase()) || false
        const matchesSchool = !searchTerms.school || classEntry.school.name.toLowerCase().includes(searchTerms.school.toLowerCase()) || false
        const matchesTeacher = !searchTerms.teacher || classEntry.teachers.some((teacher) => teacher.name.toLowerCase().includes(searchTerms.teacher.toLowerCase())) || false

        return matchesClass && matchesSchool && matchesTeacher
      })
      .sort((a: StudentClassGroup, b: StudentClassGroup) => {
        switch (sortBy) {
          case "class":
            return sortDirection === "ascending" ? (a.name || "").localeCompare(b.name || "") : (b.name || "").localeCompare(a.name || "")
          case "school":
            return sortDirection === "ascending" ? (a.school.name || "").localeCompare(b.school.name || "") : (b.school.name || "").localeCompare(a.school.name || "")
          case "teacher": {
            const aTeachers = a.teachers.map((t: Teacher) => t.name).join(", ") || ""
            const bTeachers = b.teachers.map((t: Teacher) => t.name).join(", ") || ""
            return sortDirection === "ascending" ? aTeachers.localeCompare(bTeachers) : bTeachers.localeCompare(aTeachers)
          }
          default:
            return 0
        }
      })
  })
</script>

<div class="page-content">
  <h1 class="ds-heading" data-size="lg">Klasser</h1>
  <div class="class-search-container">
    <ds-field class="ds-field">
      <label for="class-search" class="ds-label" data-weight="medium">Klasse</label>
      <input id="class-search" class="ds-input" placeholder="Søk etter klasse" type="text" bind:value={searchTerms.class} />
    </ds-field>
    <ds-field class="ds-field">
      <label for="class-search" class="ds-label" data-weight="medium">Skole</label>
      <input id="class-search" class="ds-input" placeholder="Søk etter skole" type="text" bind:value={searchTerms.school} />
    </ds-field>
    <ds-field class="ds-field">
      <label for="class-teacher-search" class="ds-label" data-weight="medium">Kontaktlærer</label>
      <input id="class-teacher-search" class="ds-input" placeholder="Søk etter kontaktlærer" type="text" bind:value={searchTerms.teacher} />
    </ds-field>
  </div>

  <div class="class-table-container">
    <table class="ds-table">
      <thead>
      <tr>
        <th aria-sort={sortBy === "class" ? sortDirection : "none"}>
          <button type="button" onclick={() => sortBy === "class" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "class"}>Klasse</button>
        </th>
        <th aria-sort={sortBy === "school" ? sortDirection : "none"}>
          <button type="button" onclick={() => sortBy === "school" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "school"}>Skole</button>
        </th>
        <th class="desktop-only" aria-sort={sortBy === "teacher" ? sortDirection : "none"}>
          <button type="button" onclick={() => sortBy === "teacher" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "teacher"}>Kontaktlærere</button>
        </th>
      </tr>
      </thead>
      <tbody>
      {#each filteredClasses as classEntry}
        <tr>
          <td>
            <a class="ds-link" href={`/classes/${classEntry.systemId}`}>{classEntry.name}</a>
          </td>
          <td>{classEntry.school.name || "Ukjent skole"}</td>
          <td class="desktop-only">
            {classEntry.teachers.length > 0 ? classEntry.teachers.map(teacher => teacher.name).join(", ") : "Ingen kontaktlærer"}
          </td>
        </tr>
      {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
    .class-search-container {
        display: flex;
        gap: var(--ds-size-4);
        margin-bottom: var(--ds-size-8);
        flex-wrap: wrap;
    }

    .class-table-container {
        display: flex;
    }

    .class-table-container table {
        flex: 1;
    }

    .desktop-only {
        display: none;
    }

    @media (min-width: 64rem) {
        th.desktop-only, td.desktop-only {
            display: table-cell;
        }
    }
</style>