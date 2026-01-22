<script lang="ts">
    import type { PageProps } from "./$types"
    
    let { data }: PageProps = $props()
</script>

<h1>Elever</h1>
<p>Velkommen til Elevoppfølging-applikasjonen.</p>
<p>Siste aktivitet</p>

<ul>
    {#each data.students as student}
        <li>{student.navn}</li>
    {/each}
</ul>
