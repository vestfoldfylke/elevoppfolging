<script lang="ts">
	import type { PageProps } from "./$types"

	let { data }: PageProps = $props()
</script>

<h1>Elever</h1>
<p>Velkommen til Elevoppfølging-applikasjonen.</p>
<p>Siste aktivitet</p>

 <p>{data.students.length}</p>
<ul>
    {#each data.students as student}
    <li><a href={`/students/${student._id}`}>{student.name}</a></li>
     <li><pre>{JSON.stringify(student, null, 2)}</pre></li>
    {/each}
</ul>
