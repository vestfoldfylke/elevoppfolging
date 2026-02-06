<script lang="ts">
	import type { PageProps } from "./$types"
	import DocumentComponent from "$lib/components/Document/Document.svelte";
    import { enhance } from "$app/forms";

	let { data, form }: PageProps = $props()

</script>

<h1>{data.student.name}</h1>
<p>Velkommen til Eleven</p>
<p>Tilgangstype: {data.accessType.type}</p>

<pre>{JSON.stringify(data.accessType, null, 2)}</pre>

<div class="documents">
  <div class="document-header">
    <h2>Dokumenter</h2>

    <form method="POST" action="?/newDocumentAction" use:enhance>
      <label for="title">
        Title
      </label>
      <input id="title" name="title" type="text">
			<label for="schoolNumber">
				School Number
			</label>
			<input id="schoolNumber" name="schoolNumber" type="text" required>
			<label for="type">
				Type
			</label>
			<input id="type" name="type" type="text" value="NOTE" required>
			<label for="note">
				Note
			</label>
			<textarea id="note" name="note" value={form?.note ?? ''} required></textarea>
      <button type="submit">Add Document</button>
    </form>
		{#if form?.message}<p class="error">{form.message}</p>{/if}

  </div>

  {#await data.documents}
    Laster...
  {:then documents}
    {#each documents as document (document._id)}
      <DocumentComponent {document} />
    {/each}
  {:catch error}
    <p>Feil ved lasting av dokumenter: {error.message}</p>
  {/await}
</div>


<style>
  .documents {
    display: flex;
    gap: 1rem 1rem;
    flex-direction: column;
    border-radius: 4px;
  }
</style>
