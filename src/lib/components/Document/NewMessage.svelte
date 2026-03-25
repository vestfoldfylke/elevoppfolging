<script lang="ts">
  import type { DocumentMessage, EditorData } from "$lib/types/db/shared-types"
  import Message from "./Message.svelte"

  type PageProps = {
    documentId: string
    groupId?: string
    studentId?: string
  }

  let { documentId, groupId, studentId }: PageProps = $props()

  let messageType: "comment" | "update" | null = $state(null)

  const mockEditor: EditorData = {
    by: {
      entraUserId: "Blabla",
      fallbackName: "Du"
    },
    at: new Date()
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

  const onNewMessageCreatedOrCancel = () => {
    messageType = null
  }
</script>

{#if messageType === null}
  <div class="new-message-actions">
    <!--<button class="ds-button" data-variant="secondary" data-size="sm" onclick={() => messageType = "comment"}><span class="material-symbols-outlined">add_comment</span>Ny kommentar</button>-->
    <button class="ds-button" data-variant="secondary" data-size="sm" onclick={() => messageType = "update"}><span class="material-symbols-outlined">info</span>Ny oppfølging/ny informasjon (eller no sånt)</button>
  </div>
{:else if messageType === "comment"}
  <Message {studentId} {groupId} editMode={true} {documentId} message={newComment} callback={onNewMessageCreatedOrCancel} />
{:else if messageType === "update"}
  <Message {studentId} {groupId} editMode={true} {documentId} message={newUpdate} callback={onNewMessageCreatedOrCancel} />
{/if}

<style>
  .new-message-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>