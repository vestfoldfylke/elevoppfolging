<script lang="ts">
  type PageHeaderProps = {
    title: string
  }

  let { title }: PageHeaderProps = $props()
</script>

<header>
  <h1 class="ds-heading" data-size="lg">{title}</h1>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    margin-bottom: var(--ds-size-4);    
  }
</style>