<script lang="ts">
  import favicon16 from "$lib/assets/favicon-32x32.png"
  import favicon32 from "$lib/assets/favicon-32x32.png"
  import "../style.css" // Add global css (and make it hot reload)
  import Menu from "$lib/components/Menu.svelte"
  import type { LayoutProps } from "./$types.js"

  // Get layout props, data will be accessible for children as well, so do not put too much here to avoid overfetching
  let { children, data }: LayoutProps = $props()
</script>

<svelte:head>
	<title>Elevoppfølging</title>
	<link rel="icon" type="image/png" sizes="32x32" href={favicon32}>
	<link rel="icon" type="image/png" sizes="16x16" href={favicon16}>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
	<style>
		@import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,700&display=swap');
		@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,700&display=swap');
		@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
	</style>
</svelte:head>

<main>
	<Menu authenticatedPrincipal={data.authenticatedPrincipal} appName="Elevoppfølging" />
	<div class="page-content">
		{#if children}
			{@render children()}
		{:else}
			<p>fallback content</p>
		{/if}
	</div>
</main>

<style>
	main {
		box-sizing: border-box;
		display: flex;
	}
	.page-content {
		box-sizing: border-box;
		padding: 0rem 0.25rem 2rem 0.25rem;
		flex: 1;
		max-width: 64rem;
		margin: 0 auto;
	}
</style>