<script lang="ts">
  import type { Source } from "$lib/types/db/shared-types"

  type PrincipalAccessTagProps = {
    source: Source
    name: string
  }

  let { source, name }: PrincipalAccessTagProps = $props()
</script>

<span class="ds-tag" data-variant="outline" data-color={source === "AUTO" ? "accent" : "brand1"} data-size="xs" style="margin-left: var(--ds-size-1)">
  {name}
</span>