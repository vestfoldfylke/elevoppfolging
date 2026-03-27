<script lang="ts">
  import { page } from "$app/state"
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton from "$lib/components/AsyncButton.svelte"
  import PageHeader from "$lib/components/PageHeader.svelte"
  import { nameValidation, ssnValidation } from "$lib/data-validation/manual-student-validation"
  import { INVALID_FORM_MESSAGE } from "$lib/data-validation/validation-constants"
  import { canManageManualStudentsOnSchool } from "$lib/shared-authorization/authorization"
  import type { NoSlashString } from "$lib/types/api/api-route-map"
  import type { ManageManualStudentsManualAccessEntry, ManualAccessEntryInput, NewManualStudentInput } from "$lib/types/db/shared-types"
  import { getClassesFromStudents } from "$lib/utils/classes-from-students"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  let currentSchool = $derived.by(() => {
    if (data.accessSchools.length === 0) {
      throw new Error("Ingen skoler funnet")
    }

    const school = data.accessSchools.find((school) => school.schoolNumber === page.params.schoolnumber)
    if (!school) {
      throw new Error("Skole ikke funnet")
    }

    return school
  })

  let schoolStudents = $derived.by(() => {
    return data.accessStudents.filter((student) => student.accessTypes.some((accessType) => accessType.type === "MANUELL-SKOLELEDER-TILGANG" && accessType.schoolNumber === currentSchool.schoolNumber))
  })

  let schoolClasses = $derived.by(() => {
    return getClassesFromStudents(schoolStudents).filter((classInfo) => classInfo.schoolNumber === currentSchool.schoolNumber)
  })

  let studentAccessEntries = $derived.by(() => {
    const studentsWithAccess = new Map<string, { name: string; appUsers: { entraUserId: string; name: string; accessEntry: ManualAccessEntryInput }[] }>()
    for (const access of data.manualAccessForSchool) {
      for (const studentAccess of access.students) {
        if (!studentsWithAccess.has(studentAccess._id)) {
          studentsWithAccess.set(studentAccess._id, { name: schoolStudents.find((student) => student._id === studentAccess._id)?.name || `Inaktiv elev (${studentAccess._id})`, appUsers: [] })
        }
        studentsWithAccess
          .get(studentAccess._id)
          ?.appUsers.push({ entraUserId: access.entraUserId, name: access.name, accessEntry: { type: "MANUELL-ELEV-TILGANG", schoolNumber: studentAccess.schoolNumber, _id: studentAccess._id } })
      }
    }
    return Array.from(studentsWithAccess.values())
  })

  let classAccessEntries = $derived.by(() => {
    const classesWithAccess = new Map<string, { name: string; appUsers: { entraUserId: string; name: string; accessEntry: ManualAccessEntryInput }[] }>()
    for (const access of data.manualAccessForSchool) {
      for (const classAccess of access.classes) {
        if (!classesWithAccess.has(classAccess.systemId)) {
          classesWithAccess.set(classAccess.systemId, {
            name: schoolClasses.find((classGroup) => classGroup.systemId === classAccess.systemId)?.name || `Inaktiv klasse (${classAccess.systemId})`,
            appUsers: []
          })
        }
        classesWithAccess.get(classAccess.systemId)?.appUsers.push({
          entraUserId: access.entraUserId,
          name: access.name,
          accessEntry: { type: "MANUELL-KLASSE-TILGANG", schoolNumber: classAccess.schoolNumber, systemId: classAccess.systemId }
        })
      }
    }
    return Array.from(classesWithAccess.values())
  })

  let manageManualStudentsAccessEntries = $derived.by(() => {
    return data.manualAccessForSchool
      .filter((access) => access.manageManualStudentsForSchools.some((school) => school.schoolNumber === currentSchool.schoolNumber))
      .map((access) => ({
        entraUserId: access.entraUserId,
        name: access.name, // TODO - sikkert bedre å hente fra app users
        accessEntry: { type: "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG", schoolNumber: currentSchool.schoolNumber }
      }))
  })

  // new access
  let addAccessForm: HTMLFormElement | undefined = $state()
  let selectedEntraUserId = $state("")
  let selectedType: ManualAccessEntryInput["type"] | "" = $state("")
  let selectedResourceId = $state("")

  // new manual student
  let addManualStudentForm: HTMLFormElement | undefined = $state()
  let newManualStudentFnr = $state("")
  let newManualStudentFirstname = $state("")
  let newManualStudentLastname = $state("")

  const addManualAccessEntry = async (): Promise<void> => {
    const validForm = addAccessForm?.reportValidity()
    if (!validForm) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!selectedType) {
      throw new Error("Access type must be selected")
    }
    if (!selectedEntraUserId) {
      throw new Error("Entra user ID must be selected")
    }

    let accessEntryToAdd: ManualAccessEntryInput

    switch (selectedType) {
      case "MANUELL-KLASSE-TILGANG":
        if (!selectedResourceId) {
          throw new Error("Resource ID must be selected")
        }
        accessEntryToAdd = { type: selectedType, schoolNumber: currentSchool.schoolNumber, systemId: selectedResourceId }
        break
      case "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG":
      case "MANUELL-ELEV-TILGANG":
        if (!selectedResourceId) {
          throw new Error("Resource ID must be selected")
        }
        accessEntryToAdd = { type: selectedType, schoolNumber: currentSchool.schoolNumber, _id: selectedResourceId }
        break
      case "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG":
        accessEntryToAdd = { type: selectedType, schoolNumber: currentSchool.schoolNumber }
        break
      default:
        throw new Error(`Invalid access entry type: ${selectedType}`)
    }

    await apiFetch(`/api/access/${selectedEntraUserId as NoSlashString}/add`, {
      method: "POST",
      body: accessEntryToAdd,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const removeManualAccessEntry = async (entraUserId: string, accessEntry: ManualAccessEntryInput): Promise<void> => {
    await apiFetch(`/api/access/${entraUserId as NoSlashString}/remove`, {
      method: "POST",
      body: accessEntry,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const addNewManualStudent = async (): Promise<void> => {
    if (!addManualStudentForm?.reportValidity()) {
      throw new Error(INVALID_FORM_MESSAGE)
    }

    if (!newManualStudentFnr) {
      throw new Error("Fødselsnummer må våre fylt ut")
    }

    if (!newManualStudentFirstname) {
      throw new Error("Fornavn må våre fylt ut")
    }

    if (!newManualStudentLastname) {
      throw new Error("Etternavn må våre fylt ut")
    }

    const newManualStudentInput: NewManualStudentInput = {
      ssn: newManualStudentFnr,
      name: `${newManualStudentFirstname} ${newManualStudentLastname}`,
      school: currentSchool
    }

    await apiFetch(`/api/students`, {
      method: "POST",
      body: newManualStudentInput,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const canCreateManualStudent = $derived.by(() => {
    if (!data.principalAccess) {
      return false
    }

    return canManageManualStudentsOnSchool(data.principalAccess, currentSchool.schoolNumber)
  })
</script>

<div class="page-content">
  <PageHeader title={`Tilgangsstyring - ${currentSchool.name}`} />

  <h2>Manuelle programområdetilganger</h2>
  <p>Kommer kanskje hvis det er behov</p>
  
  <h2>Manuelle klassetilganger</h2>
  {#each classAccessEntries as classAccess}
    <h3>{classAccess.name}</h3>
    <ul>
      {#each classAccess.appUsers as appUser}
        <li>
          {appUser.name} ({appUser.entraUserId})
        </li>
        <AsyncButton onClick={() => removeManualAccessEntry(appUser.entraUserId, appUser.accessEntry)} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="delete" />
      {/each}
    </ul>
  {/each}

  <h2>Manuelle elevtilganger</h2>
  {#each studentAccessEntries as studentAccess}
    <h3>{studentAccess.name}</h3>
    <ul>
      {#each studentAccess.appUsers as appUser}
        <li>
          {appUser.name} ({appUser.entraUserId})
        </li>
        <AsyncButton onClick={() => removeManualAccessEntry(appUser.entraUserId, appUser.accessEntry)} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="delete" />
      {/each}
    </ul>
  {/each}

  <h2>Tilgang til å opprette manuelle elever</h2>
  {#each manageManualStudentsAccessEntries as manageManualStudentsAccess}
    <ul>
      <li>
        {manageManualStudentsAccess.name} ({manageManualStudentsAccess.entraUserId})
      </li>
      <AsyncButton onClick={() => removeManualAccessEntry(manageManualStudentsAccess.entraUserId, manageManualStudentsAccess.accessEntry as ManageManualStudentsManualAccessEntry)} reloadPageDataOnSuccess={true} buttonText="Fjern tilgang" iconName="delete" />
    </ul>
  {/each}

  <br />
  <div class="new-access">
    <h2>Ny manuell tilgang</h2>
    <p>Tilganger for lærere gjøres i InSchool</p>

    <form bind:this={addAccessForm}>
      <div>
        <!-- TODO - lag en people select med litt søk og fancy, og bind mulighet -->
        <label for="appUser">Velg bruker</label>
        <select id="appUser" name="appUser" bind:value={selectedEntraUserId} required>
          {#each data.appUsers as appUser}
            <option value={appUser.entra.id}>{appUser.entra.displayName} ({appUser.entra.companyName})</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="accessType">Tilgangstype:</label>
        <select id="accessType" bind:value={selectedType} required>
          <!-- TODO: mer dynamisk liste med valg og hjelpetekst -->
          <option value="" disabled>Velg tilgangstype</option>
          <option value="MANUELL-KLASSE-TILGANG">Manuell klassetilgang</option>
          <option value="MANUELL-ELEV-TILGANG">Manuell elevtilgang</option>
          <option value="MANUELL-OPPRETT-MANUELL-ELEV-TILGANG">Tilgang til å opprette manuelle elever</option>
        </select>
      </div>

      {#if selectedType === "MANUELL-KLASSE-TILGANG"}
        <div>
          <label for="class">Velg klasse:</label>
          <select id="class" bind:value={selectedResourceId} required>
            <option value="" disabled>Velg klasse</option>
            {#each schoolClasses as classInfo}
              <option value={classInfo.systemId}>{classInfo.name}</option>
            {/each}
          </select>
        </div>
      {/if}

      {#if selectedType === "MANUELL-ELEV-TILGANG"}
        <div>
          <label for="student">Velg elev:</label>
          <select id="student" bind:value={selectedResourceId} required>
            <option value="" disabled>Velg elev</option>
            {#each schoolStudents.sort((a, b) => a.name.localeCompare(b.name)) as student}
              <option value={student._id}>{student.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </form>

    <AsyncButton onClick={addManualAccessEntry} reloadPageDataOnSuccess={true} buttonText="Legg til tilgang"  iconName="add" />

  </div>

  {#if canCreateManualStudent}
    <div class="new-manual-student">
      <h2>Ny manuell elev</h2>
      
      <form bind:this={addManualStudentForm}>
        <div class="ds-field">
          <label class="ds-label" data-weight="medium" for="fnr">Fødselsnummer</label>
          <div class="ds-field-affixes">
            <input class="ds-input" inputmode="numeric" type="text" id="fnr" pattern={ssnValidation.pattern.source} minlength={ssnValidation.minLength} maxlength={ssnValidation.maxLength} bind:value={newManualStudentFnr} required>
          </div>
        </div>

        <div class="ds-field">
          <label class="ds-label" data-weight="medium" for="firstname">Fornavn</label>
          <div class="ds-field-affixes">
            <input class="ds-input" type="text" id="firstname" pattern={nameValidation.pattern.source} minlength={nameValidation.minLength} maxlength={nameValidation.maxLength} bind:value={newManualStudentFirstname} required>
          </div>
        </div>

        <div class="ds-field">
          <label class="ds-label" data-weight="medium" for="lastname">Etternavn</label>
          <div class="ds-field-affixes">
            <input class="ds-input" type="text" id="lastname" pattern={nameValidation.pattern.source} minlength={nameValidation.minLength} maxlength={nameValidation.maxLength} bind:value={newManualStudentLastname} required>
          </div>
        </div>
      </form>

      <AsyncButton onClick={addNewManualStudent} reloadPageDataOnSuccess={true} buttonText="Legg til ny manuell elev" iconName="add" />
    </div>
  {/if}
</div>


<style>
</style>
