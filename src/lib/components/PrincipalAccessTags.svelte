<script lang="ts">
  import { page } from "$app/state"
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
  <span class="ds-tag" data-variant="outline" data-color={principalAccess.source === "AUTO" ? "accent" : "brand1"} data-size="xs" style="margin-left: var(--ds-size-1)">
    {ACCESS_TYPE_DISPLAY_NAMES[principalAccess.type]}{principalAccess.accessThroughResource ? ` ${principalAccess.accessThroughResource.name}` : ""} ved {getSchoolName(principalAccess.schoolNumber)}
  </span>
{/each}