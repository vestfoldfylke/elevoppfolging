<script lang="ts">
  import type { EditorData } from "$lib/types/db/shared-types"
  import { prettifyDate, prettifyDateTime } from "$lib/utils/dates"

  type EditorInfoProps = {
    editorInfo: EditorData
    isEdited?: boolean
    timestamp?: boolean
    modifiedIndicator?: boolean
    style?: string
    prefix?: string
  }

  let { editorInfo, isEdited = false, timestamp = false, modifiedIndicator = false, style, prefix }: EditorInfoProps = $props()
</script>

<div class="ds-paragraph" data-size="xs" style={style || ""}>
  {prefix ?? ""}{editorInfo.by.fallbackName} {timestamp ? prettifyDateTime(editorInfo.at) : prettifyDate(editorInfo.at)}{modifiedIndicator && isEdited ? " Redigert" : ""}
</div>