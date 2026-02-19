<script lang="ts">
  import type { DocumentMessage, EditorData } from "$lib/types/db/shared-types"
  import Message from "./Message.svelte"

  type PageProps = {
    documentId: string
  }

  let { documentId }: PageProps = $props()

  let messageType: "update" | "comment" | null = $state(null)

  const mockEditor: EditorData = {
    by: {
      entraUserId: "Blabla",
      fallbackName: "Du"
    },
    at: ""
  }
  const newComment: DocumentMessage = {
    messageId: "",
    type: "comment",
    content: {
      text: ""
    },
    created: mockEditor,
    modified: mockEditor
  }
  const newUpdate: DocumentMessage = {
    messageId: "",
    type: "update",
    content: {
      title: "",
      text: ""
    },
    created: mockEditor,
    modified: mockEditor
  }

  const onNewMessageCreated = () => {
    messageType = null
  }
</script>

{#if messageType === null}
  <button onclick={() => messageType = "update"}>Oppdatering</button>
  <button onclick={() => messageType = "comment"}>Kommentar</button>
{:else if messageType === "update"}
  <Message editMode={true} {documentId} message={newUpdate} callback={onNewMessageCreated} />
{:else if messageType === "comment"}
  <Message editMode={true} {documentId} message={newComment} callback={onNewMessageCreated} />
{/if}

<style>

</style>