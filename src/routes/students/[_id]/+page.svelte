<script lang="ts">
  import DocumentComponent from "$lib/components/Document/Document.svelte"
  import NewDocument from "$lib/components/Document/NewDocument.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import DataSharingConsent from "$lib/components/StudentBoxes/DataSharingConsent.svelte"
  import ImportantStuff from "$lib/components/StudentBoxes/ImportantStuff.svelte"
  import { canEditStudentDataSharingConsent, canEditStudentImportantStuff } from "$lib/shared-authorization/authorization"
  import type { SchoolInfo } from "$lib/types/db/shared-types"
  import { getFrontendStudentDetails } from "$lib/utils/frontend-student-details"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let showAllStudentContacts = $state(false)

  let studentDetails = $derived.by(() => {
    return getFrontendStudentDetails(data.student, data.APP_INFO)
  })

  let accessSchools: SchoolInfo[] = $derived.by(() => {
    const accessSchools = data.studentAccessInfo.map((access) => {
      const school = data.student.studentEnrollments.find((enrollment) => enrollment.school.schoolNumber === access.schoolNumber)?.school
      if (!school) {
        throw new Error(`School not found for access with school number ${access.schoolNumber}, something wrong here gitt`)
      }
      return school
    })

    if (accessSchools.length === 0) {
      throw new Error("No access found for student, something wrong here gitt")
    }

    return accessSchools
  })
</script>

{#key data.student._id} <!-- Re-render entire student page when student-id change -->
  <div class="student-page page-content">
    <div class="student-header">
      <!--
      <div class="student-badge">
        {getInitialsFromName(data.student.name)}
      </div>
      -->
      <div class="student-essentials">
        <PageHeader title={data.student.name} />
        <p>{studentDetails.mainSchool?.name ?? "Ukjent skole?"} - {studentDetails.mainClassMembership?.classGroup.name || "Ingen aktiv klasse ved hovedskole"}</p>
        <p><strong>Kontaktlærer{studentDetails.mainContactTeacherGroupMembership?.contactTeacherGroup.teachers.length !== 1 ? "e" : ""}:</strong> {(studentDetails.mainContactTeacherGroupMembership?.contactTeacherGroup.teachers || [{ name: "Ingen kontaktlærer ved hovedskole" }]).map(teacher => teacher.name).join(", ")}</p>
        <p>
          {#each data.studentAccessInfo as accessType}
            {accessType.type} ved {data.student.studentEnrollments.find(enrollment => enrollment.school.schoolNumber === accessType.schoolNumber)?.school.name} <br>
          {/each}
        </p>
      </div>
    </div>

    {#each accessSchools as accessSchool}
      <ImportantStuff canEdit={canEditStudentImportantStuff(accessSchool.schoolNumber, data.studentAccessInfo)} importantStuff={data.importantStuff.find(importantStuff => importantStuff.school.schoolNumber === accessSchool.schoolNumber) || null} school={accessSchool} studentCheckBoxes={data.studentCheckBoxes} student={data.student} />
    {/each}

    <DataSharingConsent canEdit={canEditStudentDataSharingConsent(data.studentAccessInfo)} student={data.student} studentDataSharingConsent={data.studentDataSharingConsent} unavailableSchoolDocuments={data.unavailableSchoolDocuments} />

    <div class="student-section">
      <div class="student-section-header">
        <h3>Personer med tilgang til eleven</h3>
      </div>
      <div class="student-section-content">
        Kommer etterhvert
        <button>Send en epost til alle disse ellerno</button>
      </div>
    </div>

    <div class="documents">
      <div class="document-header">
        <h2>Tidslinje</h2>
      </div>

      <div class="new-document">
        <NewDocument {accessSchools} documentContentTemplates={data.documentContentTemplates} studentId={data.student._id} />
      </div>

      {#if data.documents.length === 0}
        <p>Ingen notater her</p>
      {:else}
        {#each data.documents as document (document._id)}
          <DocumentComponent {document} {accessSchools} />
        {/each}
      {/if}

    </div>
  </div>
{/key}


<style>
  .student-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .student-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .student-section {
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .student-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .documents {
    display: flex;
    flex-direction: column;
    border-radius: 4px;
  }
  .new-document {
    margin-bottom: 1rem;
  }

  @media (min-width: 50rem) {
		.student-page {
      padding-left: 3rem;
      padding-right: 2rem;
    }
	}
</style>
