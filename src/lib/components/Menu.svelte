<script lang="ts">
  import { onMount } from "svelte"
  import { fade, slide } from "svelte/transition"
  import { page } from "$app/state"
  import favicon32 from "$lib/assets/favicon-32x32.png"
  import type { AuthenticatedPrincipal } from "$lib/types/authentication"

  type Props = {
    authenticatedPrincipal: AuthenticatedPrincipal
    appName: string
  }
  let { authenticatedPrincipal: authenticatedUser, appName }: Props = $props()

  let menuOpen = $state(true)

  const smallScreenWidth = 1120
  let screenIsLarge = true

  $effect(() => {
    page.url // Track page url changes
    if (!screenIsLarge) {
      menuOpen = false
    }
  })

  onMount(() => {
    if (window.innerWidth <= smallScreenWidth) {
      menuOpen = false
      screenIsLarge = false
    }
    const handleResize = () => {
      if (window.innerWidth >= smallScreenWidth && !screenIsLarge) {
        screenIsLarge = true
        menuOpen = true
      }
      if (window.innerWidth < smallScreenWidth && screenIsLarge) {
        screenIsLarge = false
        menuOpen = false
      }
    }
    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  })

  const toggleMenu = () => {
    menuOpen = !menuOpen
  }
</script>

{#if !menuOpen}
	<div class="open-menu-container" transition:fade={{ duration: 100, delay: 100 }}>
		<button class="icon-button menu-button" onclick={toggleMenu} title="Åpne meny">
			<span class="material-symbols-rounded">left_panel_open</span>
		</button>
	</div>
{:else}
	<div class="app-overlay" transition:fade={{ duration: 100 }} onclick={() => { menuOpen = false }}></div>
	<div class ="menu large-screen-space-stealer" transition:slide={{ axis: 'x', duration: 100 }}></div> 
	<div class="menu" transition:slide={{ axis: 'x', duration: 100 }}>
		<div class="menu-header">
			<div class="app-title"><img src={favicon32} alt="{appName} logo" /> {appName}</div>
			<button class="icon-button" onclick={toggleMenu} title="Lukk meny">
				<span class="material-symbols-rounded">left_panel_close</span>
			</button>
		</div>
		<div class="menu-content">
			<div class="menu-section">
				<div class="menu-items">
					<a class="menu-item" class:active={page.url.pathname === "/"} href="/">
						<span class="material-symbols-outlined">home</span>Hjem
					</a>
				</div>
			</div>
			<div class="menu-section">
				<div class="menu-section">
					<div class="menu-section-title">Jaudu</div>
					<div class="menu-items">
						<a class="menu-item" class:active={page.url.pathname === "/students"} href="/students">
							<span class="material-symbols-outlined">person</span>Elever
						</a>
					</div>
				</div>
				<div class="menu-section">
					<div class="menu-section-title">Admin</div>
					<div class="menu-items">
						<a class="menu-item" class:active={page.url.pathname === "/admin"} href="/admin">
							<span class="material-symbols-outlined">settings</span>Admin
						</a>
					</div>	
				</div>
			</div>
		</div>
		<div class="menu-footer">
			<div class="logged-in-user">
				<span class="material-symbols-outlined">account_circle</span>
				{authenticatedUser.displayName}
			</div>
			<!--
			<button class="icon-button" title="Logg ut" onclick={() => { console.log("Logging out...") }}>
				<span class="material-symbols-rounded">logout</span>
			</button>
			-->
		</div>
	</div>
{/if}
<style>
	.app-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.3);
		z-index: 50;
	}
	.open-menu-container, .menu-header {
		height: var(--header-height);
		display: flex;
		align-items: center;
	}
	.open-menu-container {
		position: fixed;
		z-index: 100;
	}
	.menu-button {
		background-color: var(--color-secondary-10);
	}
	.menu-header {
		justify-content: space-between;
	}
	.app-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: bold;
	}
	.menu {
		position: fixed;
		z-index: 100;
		width: 12rem;
		height: 100vh;
		background-color: var(--color-secondary-10);
		display: flex;
		flex-direction: column;
		padding: 0rem 1rem;
		overflow: auto;
	}
	.menu-content {
		flex: 1;
	}
	.menu-section {
		margin: 2rem 0rem;
	}
	.menu-section-title, .menu-item {
		padding: 0.25rem 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
	}
	.menu-section-title {
		font-weight: bold;
		text-transform: uppercase;
		font-size: 0.75rem;
		align-items: center;
	}
	.menu-item {
		font-size: 0.9rem;
		text-decoration: none;
		margin-bottom: 0.2rem;
		border-radius: 0.5rem;
	}
	.menu-item:hover, .menu-item.active {
		background-color: var(--color-secondary-30);
	}
	.menu-item.active {
		font-weight: bold;
	}
	.menu-item.active:hover {
		color: var(--color-primary);
	}
	.menu-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 0rem;
	}
	.logged-in-user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* If large screen */
	@media (min-width: 70rem) {
		.app-overlay {
			display: none;
		}
		.menu.large-screen-space-stealer {
			position: static;
		}
	}
	/* If very small screen */
	@media (max-width: 30rem) {
		.app-overlay {
			display: none;
		}
		.menu {
			width: calc(100% - 1rem);
		}
	}

</style>