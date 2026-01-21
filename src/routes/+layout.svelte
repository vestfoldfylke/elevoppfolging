<script lang="ts">
	import favicon from "$lib/assets/favicon.svg"
	import type { LayoutProps } from "./$types.js"


	let { children, data }: LayoutProps = $props()
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div>
	{data.authenticatedPrincipal.displayName}
	{@render children()}
</div>
