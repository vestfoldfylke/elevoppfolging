<script lang="ts">
  import DocumentComponent from "$lib/components/Document/Document.svelte"
  import NewDocument from "$lib/components/Document/NewDocument.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
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

  <div class="student-section">
    <div class="student-section-header">
      <div>&nbsp;</div>
      <button>Rediger</button>
    </div>
    <div class="student-section-content student-information">
      <div class="student-important-info">
        <h4>Viktig informasjon</h4>
        <p>{data.importantStuff?.importantInfo || "Skylder meg en hundrings"}</p>
      </div>
      <div>
        <h4>Oppfølging</h4>
        <ul>
          <li>PPT</li>
          <li>Elevtjenesten</li>
        </ul>
      </div>
      <div>
        <h4>Tilrettelegging</h4>
        <ul>
          <li>Tilrettelegging på eksamen</li>
          <li>IOP</li>
          <li>Dysleksi</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="student-section">
    <div class="student-section-header">
      <h3>Skolesamarbeid</h3>
    </div>
    <div class="student-section-content">
      <p>Eleven har {data.studentDataSharingConsent?.consent ? "samtykket til deling av data" : "ikke samtykket til deling av data"}</p>
      {#if data.unavailableSchoolDocuments.length > 0}
        <p>Det finnes dokumenter fra følgende skoler som ikke er tilgjengelige for deg:</p>
        <ul>
          {#each data.unavailableSchoolDocuments as unavailableSchoolDocument}
            <li>{unavailableSchoolDocument.school.name} - {unavailableSchoolDocument.numberOfDocuments} dokument{unavailableSchoolDocument.numberOfDocuments > 1 ? "er" : ""}</li>
          {/each}
        </ul>
      {:else}
        <p>Det finnes ikke noen notater fra andre skoler på denne eleven</p>
      {/if}
    </div>
  </div>

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
      {#key data.student._id} <!-- Re-render document components when student-id change DO NOT REMOVE ME, OR ELSE DOCUMENTS CAN BE CREATED ON WRONG STUDENT!  -->
        <NewDocument {accessSchools} documentContentTemplates={data.documentContentTemplates} studentId={data.student._id} />
      {/key}
    </div>

    {#if data.documents.length === 0}
      <p>Ingen notater her</p>
    {:else}
      {#key data.student._id} <!-- Re-render document components when student-id change -->
        {#each data.documents as document (document._id)}
          <DocumentComponent {document} {accessSchools} />
        {/each}
      {/key}
    {/if}

  </div>
</div>


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
  .student-section-content.student-information {
    display: flex;
    gap: 1rem;
    padding: 0.5rem;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  .student-important-info {
    flex: 1;
    min-width: 18rem;
  }
  .student-information {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .documents {
    display: flex;
    flex-direction: column;
    border-radius: 4px;
  }
  .new-document {
    margin-bottom: 1rem;
  }
</style>
