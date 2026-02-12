<script lang="ts">
  import DocumentComponent from "$lib/components/Document/Document.svelte"
  import DocumentCreator from "$lib/components/Document/DocumentCreator.svelte"
  import type { PageProps } from "./$types"

  let { data, form }: PageProps = $props()

  let showAllStudentContacts = $state(false)

  type StudentContactPerson = {
    name: string
    type: "Kontaktlærer" | "Klasselærer" | "Faglærer" | "Noe"
  }

  type SchoolContacts = {
    [schoolNumber: string]: {
      mainSchool: boolean
      schoolNumber: string
      name: string
      contactPersons: StudentContactPerson[]
    }
  }
  let schoolContacts = $derived.by(() => {
    const schoolContacts: SchoolContacts = {}

    data.student.studentEnrollments.forEach((enrollment) => {
      const schoolNumber = enrollment.school.schoolNumber
      if (!schoolContacts[schoolNumber]) {
        schoolContacts[schoolNumber] = { mainSchool: enrollment.mainSchool, schoolNumber, name: enrollment.school.name, contactPersons: [] }
      }

      enrollment.contactTeacherGroupMemberships.forEach((membership) => {
        if (!membership.period.active) {
          return
        }
        membership.contactTeacherGroup.teachers.forEach((teacher) => {
          if (!schoolContacts[schoolNumber].contactPersons.some((contact) => contact.name === teacher.name)) {
            schoolContacts[schoolNumber].contactPersons.push({ name: teacher.name, type: "Kontaktlærer" })
          }
        })
      })

      enrollment.classMemberships.forEach((membership) => {
        if (!membership.period.active) {
          return
        }
        membership.classGroup.teachers.forEach((teacher) => {
          if (!schoolContacts[schoolNumber].contactPersons.some((contact) => contact.name === teacher.name)) {
            schoolContacts[schoolNumber].contactPersons.push({ name: teacher.name, type: "Klasselærer" })
          }
        })
      })

      enrollment.teachingGroupMemberships.forEach((membership) => {
        if (!membership.period.active) {
          return
        }
        membership.teachingGroup.teachers.forEach((teacher) => {
          if (!schoolContacts[schoolNumber].contactPersons.some((contact) => contact.name === teacher.name)) {
            schoolContacts[schoolNumber].contactPersons.push({ name: teacher.name, type: "Faglærer" })
          }
        })
      })
    })

    return Object.values(schoolContacts).sort((a, b) => Number(b.mainSchool) - Number(a.mainSchool))
  })
</script>

<div class="student-page">
  <div class="student-header">
    <!--
    <div class="student-badge">
      {getInitialsFromName(data.student.name)}
    </div>
    -->
    <div class="student-essentials">
      <h2>{data.student.name}</h2>
      <p>{data.student.mainSchool?.name ?? "Ukjent skole?"} - {data.student.mainClass?.name || "Ingen aktiv klasse ved hovedskole"}</p>
      <p><strong>Kontaktlærer{data.student.mainContactTeacherGroup?.teachers.length !== 1 ? "e" : ""}:</strong> {(data.student.mainContactTeacherGroup?.teachers || [{ name: "Ingen kontaktlærer ved hovedskole" }]).map(teacher => teacher.name).join(", ")}</p>
      <p>
        {#each data.accessTypes as accessTypes}
          {accessTypes.type} ved {data.student.studentEnrollments.find(enrollment => enrollment.school.schoolNumber === accessTypes.schoolNumber)?.school.name} <br>
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
      <h3>Tilknyttede personer</h3>
    </div>
    <div class="student-section-content">
      {#if schoolContacts.length > 1}
        <p><strong>OBS!</strong> Har også elevforhold ved <strong>{schoolContacts.filter(school => school.schoolNumber !== data.student.mainSchool?.schoolNumber).map(school => school.name).join(", ")}</strong></p>
      {/if}
      {#each schoolContacts as schoolContact}
        <div class="school-contact">
          <h4>{schoolContact.name}</h4>
          <ul>
            {#each showAllStudentContacts ? schoolContact.contactPersons : schoolContact.contactPersons.slice(0, 3) as contactPerson}
              <li>{contactPerson.name} - {contactPerson.type}</li>
            {/each}
            {#if schoolContact.contactPersons.length > 3}
              {#if !showAllStudentContacts}
                <li>... og {schoolContact.contactPersons.length} flere kontaktpersoner</li>
              {/if}
            {/if}
          </ul>
        </div>
      {/each}
      {#if schoolContacts.some(schoolContactList => schoolContactList.contactPersons.length > 3)}
        {#if !showAllStudentContacts}
          <button onclick={() => showAllStudentContacts = true}>Vis alle kontaktpersoner</button>
        {:else}
          <button onclick={() => showAllStudentContacts = false}>Vis færre kontaktpersoner</button>
        {/if}
      {/if}
      <button>Send en epost til alle disse ellerno</button>
    </div>
  </div>

  <div class="documents">
    <div class="document-header">
      <h2>Tidslinje</h2>
    </div>
    <DocumentCreator {form} accessTypes={data.accessTypes} />

    {#each data.documents as document (document._id)}
      <DocumentComponent {document} {form}/>
    {/each}
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
    gap: 1rem 1rem;
    flex-direction: column;
    border-radius: 4px;
  }
</style>
