<script lang="ts">
  type PageHeaderProps = {
    title: string
  }

  let { title }: PageHeaderProps = $props()
</script>

<header>
  <div class="little-man-to-make-space-for-the-menu-button">&nbsp;</div>
  <h1>{title}</h1>
</header>
<style>
  header {
    display: flex;
    align-items: center;
    height: var(--header-height);
  }
  h1 {
    margin: 0;
  }
  .little-man-to-make-space-for-the-menu-button {
    width: 2.5rem;
  }
  @media (min-width: 66.5rem) {
    .little-man-to-make-space-for-the-menu-button {
      display: none;
    }
  }
</style>