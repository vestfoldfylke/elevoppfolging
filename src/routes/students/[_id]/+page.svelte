<script lang="ts">
	import type { PageProps } from "./$types"

	let { data }: PageProps = $props()
</script>

<h1>{data.student.name}</h1>
<p>Velkommen til Eleven</p>
<p>Tilgangstype: {data.accessType.type}</p>

<pre>{JSON.stringify(data.accessType, null, 2)}</pre>

