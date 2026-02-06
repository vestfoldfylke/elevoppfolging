<script lang="ts">
	import DocumentComponent from "$lib/components/Document/Document.svelte"
	import DocumentCreator from "$lib/components/DocumentCreator.svelte"
	import type { PageProps } from "./$types"

	let { data, form }: PageProps = $props()

	let studentInfo = $derived.by(() => {
		const mainEnrollment = data.student.studentEnrollments.find((enrollment) => enrollment.mainSchool) || data.student.studentEnrollments[0] || null
		const mainSchool = mainEnrollment?.school
		const mainClass = mainEnrollment?.classMemberships.find((membership) => membership.period.active)?.classGroup.name
		const contactTeachers = mainEnrollment?.contactTeacherGroupMemberships.map((membership) => membership.contactTeacherGroup.teachers) || []

		return {
			mainSchool,
			mainClass,
			contactTeachers
		}
	})

	type TeacherInfo = {
		name: string
		type: "Kontaktlærer" | "Klasselærer" | "Faglærer"
		schools: { [schoolNumber: string]: string }
	}
	let studentTeachers = $derived.by(() => {
		const teachers: { [feideName: string]: TeacherInfo } = {}

		data.student.studentEnrollments.forEach((enrollment) => {
			enrollment.contactTeacherGroupMemberships.forEach((membership) => {
				membership.contactTeacherGroup.teachers.forEach((teacher) => {
					if (!teachers[teacher.feideName]) {
						teachers[teacher.feideName] = { name: teacher.name, type: "Kontaktlærer", schools: {} }
					}
					teachers[teacher.feideName].schools[enrollment.school.schoolNumber] = enrollment.school.name
				})
			})

			enrollment.classMemberships.forEach((membership) => {
				membership.classGroup.teachers.forEach((teacher) => {
					if (!teachers[teacher.feideName]) {
						teachers[teacher.feideName] = { name: teacher.name, type: "Klasselærer", schools: {} }
					}
					teachers[teacher.feideName].schools[enrollment.school.schoolNumber] = enrollment.school.name
				})
			})

			enrollment.teachingGroupMemberships.forEach((membership) => {
				membership.teachingGroup.teachers.forEach((teacher) => {
					if (!teachers[teacher.feideName]) {
						teachers[teacher.feideName] = { name: teacher.name, type: "Faglærer", schools: {} }
					}
					teachers[teacher.feideName].schools[enrollment.school.schoolNumber] = enrollment.school.name
				})
			})
		})

		return Object.values(teachers)
	})
</script>

<h1>{data.student.name}</h1>
<p>Velkommen til Eleven</p>

<div class="student-info">
  <p>{studentInfo.mainSchool?.name ?? "Ukjent skole"}</p>
  <p>{data.student.name}</p>
  <p>{studentInfo.mainClass}</p>
  <p>Kontaktlærere: {studentInfo.contactTeachers.flat().map(teacher => teacher.name).join(", ")}</p>
</div>

<div class="student-teachers">
  <h2>Lærere</h2>
  {#each studentTeachers as teacher}
    <div class="teacher">
      <p>{teacher.name} - {teacher.type} - Skoler: {Object.values(teacher.schools).join(", ")}</p>
    </div>
  {/each}
  
</div>

<pre>{JSON.stringify(data.accessTypes, null, 2)}</pre>

<div class="documents">
  <div class="document-header">
    <h2>Dokumenter</h2>
  </div>
  <DocumentCreator {form} accessTypes={data.accessTypes} />

  {#await data.documents}
    Laster...
  {:then documents}
    {#each documents as document (document._id)}
      <DocumentComponent {document} {form}/>
    {/each}
  {:catch error}
    <p>Feil ved lasting av dokumenter: {error.message}</p>
  {/await}
</div>


<style>
  .documents {
    display: flex;
    gap: 1rem 1rem;
    flex-direction: column;
    border-radius: 4px;
  }
</style>
