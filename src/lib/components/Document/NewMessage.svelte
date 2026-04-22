<script lang="ts">
  import { tick } from "svelte"
  import type { DocumentMessage, EditorData } from "$lib/types/db/shared-types"
  import Message from "./Message.svelte"

  type PageProps = {
    documentId: string
    groupId?: string
    studentId?: string
  }

  let { documentId, groupId, studentId }: PageProps = $props()

  let messageType: "update" | null = $state(null)

  const mockEditor: EditorData = {
    by: {
      entraUserId: "Blabla",
      fallbackName: "Du"
    },
    at: new Date()
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

  const scrollToNewMessage = async () => {
    await tick()
    const newMessageElement = document.getElementById("new-message-container")
    if (newMessageElement) {
      newMessageElement.scrollIntoView({ behavior: "smooth" })
    }
  }
</script>

{#if messageType === null}
  <div class="new-message-actions">
    <button class="ds-button" data-variant="primary" data-size="sm" onclick={() => { messageType = "update"; scrollToNewMessage(); }}><span class="material-symbols-outlined">info</span>Ny oppfølging/ny informasjon (eller no sånt)</button>
  </div>
{:else}
  <div id="new-message-container">
    {#if messageType === "update"}
      <Message {studentId} {groupId} editMode={true} {documentId} message={newUpdate} callback={onNewMessageCreatedOrCancel} />
    {/if}
  </div>
{/if}

<style>
  .new-message-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>