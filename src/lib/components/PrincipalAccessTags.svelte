<script lang="ts">
  import { page } from "$app/state"
  import PrincipalAccessTag from "$lib/components/PrincipalAccessTag.svelte"
  import type { PrincipalAccessForStudent } from "$lib/types/app-types"
  import { ACCESS_TYPE_DISPLAY_NAMES } from "$lib/utils/access-constants"

  type PrincipalAccessTagsProps = {
    principalAccessForStudent: PrincipalAccessForStudent[]
  }

  let { principalAccessForStudent }: PrincipalAccessTagsProps = $props()

  const getSchoolName = (schoolNumber: string): string => {
    const school = page.data.schools.find((school) => school.schoolNumber === schoolNumber)
    if (!school) {
      throw new Error(`School not found for school number ${schoolNumber}, something wrong here gitt`)
    }
    return school.name
  }

  let strongestPrincipalAccess: PrincipalAccessForStudent | undefined = $derived.by(() => {
    if (principalAccessForStudent.length === 0) {
      return undefined
    }
    return principalAccessForStudent[0]
  })
</script>

{#if strongestPrincipalAccess}
  <PrincipalAccessTag source={strongestPrincipalAccess.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[strongestPrincipalAccess.type]}${strongestPrincipalAccess.accessThroughResource ? ` ${strongestPrincipalAccess.accessThroughResource.name}` : ""} ved ${getSchoolName(strongestPrincipalAccess.schoolNumber)}`} />
{/if}
{#if principalAccessForStudent.length > 1}
  {@const randomId = crypto.randomUUID()}
  
  <button class="ds-button custom-ds-button-badge" type="button" popoverTarget="additional-principal-access-{randomId}">+{principalAccessForStudent.length - 1}</button>
  
  <div class="ds-popover custom-ds-popover" id="additional-principal-access-{randomId}" popover="auto" data-placement="top" data-autoplacement="true">
    {#each principalAccessForStudent.slice(1) as access}
      <PrincipalAccessTag source={access.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[access.type]}${access.accessThroughResource ? ` ${access.accessThroughResource.name}` : ""} ved ${getSchoolName(access.schoolNumber)}`} />
      <br />
    {/each}
  </div>
{/if}

<style>
  .custom-ds-button-badge {
    --dsc-badge-padding: 0 calc(var(--ds-size-1) + var(--ds-size-1) / 2);
    --dsc-badge-size: calc(var(--ds-size-3) + var(--ds-size-1) / 2);
    --dsc-badge-top: inherit;
    --dsc-badge-bottom: inherit;
    --dsc-badge-left: inherit;
    --dsc-badge-right: inherit;
    vertical-align: middle;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;

    border-radius: var(--ds-border-radius-full);
    display: inline-grid;
    font-size: var(--ds-font-size-minus-1);
    min-height: var(--dsc-badge-size);
    min-width: var(--dsc-badge-size);
    padding: var(--dsc-badge-padding);
    place-items: center;
    box-sizing: border-box;
    line-height: var(--ds-line-height-sm);
    width: -moz-fit-content;
    width: fit-content;
  }

  .custom-ds-popover {
    max-width: fit-content;
  }
</style>