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
</script>

{#each principalAccessForStudent as principalAccess}
  <PrincipalAccessTag source={principalAccess.source} name={`${ACCESS_TYPE_DISPLAY_NAMES[principalAccess.type]}${principalAccess.accessThroughResource ? ` ${principalAccess.accessThroughResource.name}` : ""} ved ${getSchoolName(principalAccess.schoolNumber)}`} />
{/each}