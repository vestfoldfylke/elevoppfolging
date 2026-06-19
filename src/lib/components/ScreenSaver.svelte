<script lang="ts">
  import { page } from "$app/state"

  let screenSaverDialog: HTMLDialogElement | undefined = $state()
  const inactivityTimeoutSeconds: number = page.data.APP_INFO.SCREEN_SAVER_INACTIVITY_TIMEOUT_SECONDS

  const showScreenSaverDialog = () => {
    if (screenSaverDialog && !screenSaverDialog.open) {
      screenSaverDialog.showModal()
    }
  }

  const closeScreenSaverDialog = () => {
    if (screenSaverDialog?.open) {
      screenSaverDialog.close()
      resetTimer()
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const resetTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Schedule the dialog to appear exactly after the timeout period
    timeoutId = setTimeout(() => {
      showScreenSaverDialog()
    }, inactivityTimeoutSeconds * 1000)
  }

  let lastReset = 0
  const onActivity = () => {
    const now = Date.now()
    if (now - lastReset < 1000) {
      return
    }

    lastReset = now
    resetTimer()
  }

  $effect(() => {
    // Initialize the timer on mount
    resetTimer()

    // Add real user activity listeners to reset the timer
    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"]

    activityEvents.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true })
    })

    // Clean up the timer and event listeners when the effect destroys
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      activityEvents.forEach((event) => {
        window.removeEventListener(event, onActivity)
      })
    }
  })
</script>


<dialog bind:this={screenSaverDialog} id="inactivity-dialog" class="ds-dialog" data-placement="center">
  <div class="ds-dialog__block">
    <p class="ds-paragraph">Du har vært inaktiv for lenge, og innholdet er skjult av sikkerhetsmessige årsaker.</p>
  </div>
  <div class="ds-dialog__block">
    <button class="ds-button" data-variant="primary" onclick={closeScreenSaverDialog}>Jeg er her fortsatt, jeg 🫡 </button>
  </div>
</dialog>

<style>
  .ds-dialog::backdrop {
		-webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
	}
</style>