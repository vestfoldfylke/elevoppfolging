<script lang="ts">
	import type { DocumentMessage } from "$lib/types/db/shared-types"

	type PageProps = {
		message: DocumentMessage
	}

	let { message }: PageProps = $props()
</script>

<div class="message">
  <p>{message.content.text}</p>
  <p>— {message.created.by.displayName}</p>
</div>

<style>

</style>