<script lang="ts">
  import type { EditorData } from "$lib/types/db/shared-types";
  import { prettifyDate, prettifyDateTime } from "$lib/utils/prettify-date";

  type EditorInfoProps = {
    modified: EditorData
    created?: EditorData
    timestamp?: boolean
    modifiedIndicator?: boolean
    style?: string
  }

  let { created, modified, timestamp = false, modifiedIndicator = false, style }: EditorInfoProps = $props()
</script>

<div class="ds-paragraph" data-size="xs" style={style || ""}>{created?.by.fallbackName ?? modified.by.fallbackName} {timestamp ? prettifyDateTime(created?.at ?? modified.at) : prettifyDate(created?.at ?? modified.at)}{ modifiedIndicator && modified.at > (created?.at ?? modified.at) ? " Redigert" : ""}</div>