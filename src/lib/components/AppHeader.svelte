<script lang="ts">
  import { page } from "$app/state"
  import favicon32 from "$lib/assets/favicon-32x32.png"
  import { canAccessSchoolAdministration, isSystemAdmin } from "$lib/shared-authorization/authorization"

  let mobileMenuOpen = $state(false)

  type MenuItem = {
    name: string
    href: string
    hrefStartsWith?: string
  }

  const menuItems: MenuItem[] = [
    { name: "Elever", href: "/", hrefStartsWith: "/students" },
    { name: "Klasser", href: "/classes", hrefStartsWith: "/classes" }
  ]

  if (canAccessSchoolAdministration(page.data.principalAccess)) {
    menuItems.push({ name: "Skoleadministrasjon", href: "/schooladministration", hrefStartsWith: "/schooladministration" })
  }

  if (isSystemAdmin(page.data.authenticatedPrincipal, page.data.APP_INFO)) {
    menuItems.push({ name: "Systemadministrasjon", href: "/system", hrefStartsWith: "/system" })
  }
</script>

<div class="app-header">
  <div class="header-container">
    <div class="logo-container">
      <img src={favicon32} alt="{page.data.APP_INFO.NAME} logo" />
      <span class="app-title">{page.data.APP_INFO.NAME}</span>
    </div>
    <nav class="desktop-menu">
      <ul class="desktop-menu-items">
        {#each menuItems as menuItem}
          <li>
            <a class="ds-paragraph ds-focus" data-variant="default" data-size="md" class:active={page.url.pathname === menuItem.href || (menuItem.hrefStartsWith && page.url.pathname.startsWith(menuItem.hrefStartsWith))} href={menuItem.href}>{menuItem.name}</a>
          </li>
        {/each}
      </ul>
    </nav>
    <nav class="menu-right">
      <span
        class="ds-avatar"
        data-variant="circle"
        data-initials="{page.data.authenticatedPrincipal.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}"
        role="img"
        aria-label="small"
        data-size="sm"
      ></span>

      <button
        onclick={() => mobileMenuOpen = !mobileMenuOpen}
        class="ds-button mobile-menu-button"
        data-variant="tertiary"
        type="button"
        popoverTarget="hamburger-menu"
      ><span class="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span></button>
      <div
        class="ds-popover ds-dropdown"
        id="hamburger-menu"
        popover="manual"
        data-placement="bottom-end"
        data-variant="default"
      >
        <ul>
          {#each menuItems as menuItem}
            <li>
              <a
                href={menuItem.href}
                class="ds-button"
                data-variant="tertiary"
            >
              {menuItem.name}
            </a>
          </li>
        {/each}
        </ul>
      </div>
    </nav>
  </div>

  {#if page.data.APP_INFO.BANNER_INFO_MESSAGE}
    <div class="info-banner-container">
      <div class="info-banner">
        <span class="material-symbols-outlined" aria-hidden="true">info</span>
        <p class="ds-paragraph">{page.data.APP_INFO.BANNER_INFO_MESSAGE}</p>
      </div>
    </div>
  {/if}

</div>

<style>
  .app-header {
    width: 100%;
  }
  .header-container {
		flex: 1;
    max-width: var(--max-page-width);
    margin: 0 auto;
		height: var(--header-height);
		display: flex;
		align-items: center;
		padding: 0 var(--ds-size-4);
		justify-content: space-between;
	}

	.logo-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
	}

	nav {
		display: flex;
    align-items: center;
	}

  nav.desktop-menu {
    display: none;
  }

	ul.desktop-menu-items > li {
		list-style: none;
		margin-left: var(--ds-size-7);
	}

	ul.desktop-menu-items > li a {
		color: inherit;
    text-decoration: none;
    border-bottom: 3px solid transparent;
    padding-bottom: var(--ds-size-2);
    transition: .1s border-color ease-out;
	}

	ul.desktop-menu-items > li a:hover, ul.desktop-menu-items > li a:focus-visible {
		border-color: var(--ds-color-neutral-border-subtle);
	}

	ul.desktop-menu-items > li a.active {
		border-color: var(--ds-color-neutral-border-strong);
    font-weight: 600;
	}

	ul.desktop-menu-items {
		display: flex;
    margin: 0 var(--ds-size-14) 0 0;
    padding: 0;
    max-width: 100%;
    align-items: center;
  }

  .menu-right {
    gap: var(--ds-size-2);
  }

  @media (min-width: 1024px) {
    nav.desktop-menu {
      display: flex;
    }
    .mobile-menu-button {
      display: none;
    }
  }

  .info-banner-container {
    background-color: var(--ds-color-info-background-tinted);
    border-top: 1px solid var(--ds-color-neutral-border-subtle);
    width: 100%;
  }

  .info-banner {
    max-width: var(--max-page-width);
    padding: var(--ds-size-3) var(--ds-size-4);
    margin: 0 auto;
    display: flex;
    gap: var(--ds-size-2);
  }

</style>