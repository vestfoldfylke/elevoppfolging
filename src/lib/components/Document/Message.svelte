<script lang="ts">
  import type { DocumentMessage } from "$lib/types/db/shared-types"

  type PageProps = {
    message: DocumentMessage
  }

  let { message }: PageProps = $props()
</script>

<div class="message">
  <p>{message.content.text}</p>
  <!-- TODO: Find a better way to show who created the message. Fetch name from Users or do it on load? -->
  <p>— {message.created.by.fallbackName}</p>
</div>

<style>

</style>