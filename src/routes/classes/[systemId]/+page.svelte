<script lang="ts">
  import { page } from "$app/state"
  import PrincipalAccessTag from "$lib/components/PrincipalAccessTag.svelte"
  import type { EnrollmentWithinViewAccessWindow, FrontendOverviewStudent, PrincipalAccess, ProgramAreaPrincipalAccess } from "$lib/types/app-types"
  import type { ClassAutoAccessEntry, ClassManualAccessEntry, SchoolLeaderManualAccessEntry, StudentClassGroup } from "$lib/types/db/shared-types"
  import { ACCESS_TYPE_DISPLAY_NAMES } from "$lib/utils/access-constants"
  import type { PageProps } from "./$types"

  type ClassAccess = {
    classEntries: (ClassAutoAccessEntry | ClassManualAccessEntry)[]
    programAreas: ProgramAreaPrincipalAccess[]
    schools: SchoolLeaderManualAccessEntry[]
  }

  let { data }: PageProps = $props()

  let sortBy = $state<"name">("name")
  let sortDirection = $state<"ascending" | "descending">("ascending")

  const principalAccess: PrincipalAccess = $derived.by(() => {
    if (!data.principalAccess) {
      throw new Error("No access found for principal")
    }

    if (data.principalAccess.programAreas.length === 0 && data.principalAccess.classes.length === 0) {
      throw new Error("No program areas or classes found on this principal access")
    }

    return data.principalAccess
  })

  const classAccess: ClassAccess = $derived.by(() => {
    const programAreas = principalAccess.programAreas.filter((programArea) => programArea.classSystemIds.includes(selectedClass.systemId))
    const classEntries = principalAccess.classes.filter((classEntry) => classEntry.systemId === selectedClass.systemId)
    const schools = principalAccess.leaderForSchools.filter((leaderForSchool) => leaderForSchool.schoolNumber === selectedClass.school.schoolNumber)

    if (programAreas.length === 0 && classEntries.length === 0 && schools.length === 0) {
      throw new Error("No access to this class found for principal")
    }

    return {
      classEntries,
      programAreas,
      schools
    }
  })

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
  <div class="page-header">
    <h1 class="ds-heading" data-size="lg">{selectedClass.name}</h1>
    <span class="ds-paragraph" data-size="sm">{selectedClass.school.name}</span>
  </div>

  <p class="ds-paragraph" data-size="sm" style="margin-top: var(--ds-size-2);">Din tilgang til klassen</p>
  <div class="access-info">
    {#if classAccess.classEntries.length > 0}
      {#each classAccess.classEntries as classEntry}
        <PrincipalAccessTag source={classEntry.source} name={ACCESS_TYPE_DISPLAY_NAMES[classEntry.type]} />
      {/each}
    {/if}

    {#if classAccess.programAreas.length > 0}
      {#each classAccess.programAreas as programArea}
        <PrincipalAccessTag source={programArea.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[programArea.type]} via ${programArea.name}`} />
      {/each}
    {/if}

    {#if classAccess.schools.length > 0}
      {#each classAccess.schools as school}
        <PrincipalAccessTag source={school.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[school.type]} for ${selectedClass.school.name}`} />
      {/each}
    {/if}
  </div>

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

<style>
  .page-header {
      padding-bottom: var(--ds-size-4);
  }

  .access-info {
      display: flex;
      gap: var(--ds-size-2);
      flex-wrap: wrap;
      padding-bottom: var(--ds-size-4);
  }
</style>