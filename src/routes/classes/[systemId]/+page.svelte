<script lang="ts">
  import { page } from "$app/state"
  import type { EnrollmentWithinViewAccessWindow, FrontendOverviewStudent } from "$lib/types/app-types"
  import type { StudentClassGroup } from "$lib/types/db/shared-types"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let sortBy = $state<"name">("name")
  let sortDirection = $state<"ascending" | "descending">("ascending")

  let selectedClass: StudentClassGroup = $derived.by(() => {
    const classId: string | undefined = page.params.systemId
    if (!classId) {
      throw new Error("Klasse ID mangler")
    }

    const selectedClassEntry: StudentClassGroup | undefined = data.classes.find((classEntry: StudentClassGroup) => classEntry.systemId === classId)
    if (!selectedClassEntry) {
      throw new Error("Klasse ID ikke funnet")
    }

    return selectedClassEntry
  })

  let classStudents: FrontendOverviewStudent[] = $derived.by(() =>
    data.students.filter((student: FrontendOverviewStudent) =>
      student.enrollmentsWithinViewAccessWindow.some((enrollment: EnrollmentWithinViewAccessWindow) =>
        enrollment.classMemberships.some((classMembership) => classMembership.classGroup.systemId === selectedClass.systemId)
      )
    )
  )

  let filteredStudents = $derived.by(() => {
    return classStudents.sort((a: FrontendOverviewStudent, b: FrontendOverviewStudent) => {
      switch (sortBy) {
        case "name":
          return sortDirection === "ascending" ? (a.name || "").localeCompare(b.name || "") : (b.name || "").localeCompare(a.name || "")
        default:
          return 0
      }
    })
  })
</script>

<div class="page-content">
  <h1 class="ds-heading" data-size="lg">{selectedClass.name}</h1>
  
  <div class="class-table-container">
    <table class="ds-table">
      <thead>
      <tr>
        <th aria-sort={sortBy === "name" ? sortDirection : "none"}>
          <button type="button" onclick={() => sortBy === "name" ? sortDirection = sortDirection === "ascending" ? "descending" : "ascending" : sortBy = "name"}>Elev</button>
        </th>
      </tr>
      </thead>
      <tbody>
      {#each filteredStudents as classStudent}
        <tr>
          <td>
            <a class="ds-link" href={`/students/${classStudent._id}`}>{classStudent.name}</a>
          </td>
        </tr>
      {/each}
      </tbody>
    </table>
  </div>
</div>
