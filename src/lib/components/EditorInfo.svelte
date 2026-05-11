<script lang="ts">
  import type { EditorData } from "$lib/types/db/shared-types"
  import { prettifyDate, prettifyDateTime } from "$lib/utils/dates"

  type EditorInfoProps = {
    modified: EditorData
    created: EditorData
    timestamp?: boolean
    modifiedIndicator?: boolean
    style?: string
    prefix?: string
  }

  let { created, modified, timestamp = false, modifiedIndicator = false, style, prefix }: EditorInfoProps = $props()
</script>

<div class="ds-paragraph" data-size="xs" style={style || ""}>
  {prefix ?? ""}{modified.by.fallbackName} {timestamp ? prettifyDateTime(modified.at) : prettifyDate(modified.at)}{modifiedIndicator && modified.at > (created.at) ? " Redigert" : ""}
</div>