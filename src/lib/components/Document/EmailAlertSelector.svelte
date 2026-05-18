<script lang="ts">
  import { untrack } from "svelte"
  import { isOnlySubjectTeacher } from "$lib/shared-authorization/authorization"
  import type { PrincipalAccessForStudent, StudentAccessPerson } from "$lib/types/app-types"
  import PrincipalAccessTags from "../PrincipalAccessTags.svelte"

  type Props = {
    id: string
    legendText: string
    studentAccessPersons: StudentAccessPerson[]
    studentDataSharingConsent: boolean | undefined
    schoolNumber: string
    documentAccess: string
    emailAlertReceivers: string[]
  }

  let { id, legendText, studentAccessPersons, studentDataSharingConsent, schoolNumber, documentAccess, emailAlertReceivers = $bindable() }: Props = $props()

  const alertableAccessPersons = $derived.by(() => {
    const withRelevantAccess = studentAccessPersons
      .map((person: StudentAccessPerson) => ({
        ...person,
        principalAccessForStudent: studentDataSharingConsent
          ? person.principalAccessForStudent
          : person.principalAccessForStudent.filter((access: PrincipalAccessForStudent) => access.schoolNumber === schoolNumber)
      }))
      .filter((person) => person.principalAccessForStudent.length > 0)

    return withRelevantAccess.filter((person) => {
      return documentAccess === "ALL_WITH_STUDENT_ACCESS" || !isOnlySubjectTeacher(person.principalAccessForStudent)
    })
  })

  // Filter out email alert receivers that doesn't have access anymore, in case the document access changes
  $effect(() => {
    const persons = alertableAccessPersons // Only reactive on alertableAccessPersons
    untrack(() => {
      emailAlertReceivers = emailAlertReceivers.filter((upn) => persons.some((p) => p.entra.userPrincipalName === upn))
    })
  })

  const allSelected = $derived(alertableAccessPersons.length > 0 && alertableAccessPersons.every((p) => emailAlertReceivers.includes(p.entra.userPrincipalName)))

  const toggleSelectAll = (target: HTMLInputElement) => {
    if (alertableAccessPersons.length === 0) {
      return
    }
    emailAlertReceivers = target.checked ? alertableAccessPersons.map((p) => p.entra.userPrincipalName) : []
  }
</script>

{#if alertableAccessPersons.length > 0}
  <fieldset class="ds-fieldset content-item">
    <legend class="ds-label" data-weight="medium">
      {legendText}
    </legend>

    <ds-field class="ds-field">
      <input id="{id}-choose-all" class="ds-input" type="checkbox" name="{id}-choose-all" checked={allSelected} onchange={(e) => toggleSelectAll(e.target as HTMLInputElement)} />
      <label for="{id}-choose-all" class="ds-label" data-weight="regular">Velg alle</label>
    </ds-field>

    {#each alertableAccessPersons as person}
      <ds-field class="ds-field">
        <input id="{id}-{person.entra.id}" class="ds-input" type="checkbox" name="{id}" value={person.entra.userPrincipalName} bind:group={emailAlertReceivers} />
        <label for="{id}-{person.entra.id}" class="ds-label" data-weight="regular">
          {person.entra.displayName}
          <PrincipalAccessTags principalAccessForStudent={person.principalAccessForStudent} />
        </label>
      </ds-field>
    {/each}
  </fieldset>
{/if}
