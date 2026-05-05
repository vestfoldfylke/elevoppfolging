<script lang="ts">
  import { page } from "$app/state"

  let lastActivityTimestamp: Date = $state(new Date())
  let screenSaverDialog: HTMLDialogElement | undefined = $state()
  const inactivityTimeoutSeconds: number = page.data.APP_INFO.SCREEN_SAVER_INACTIVITY_TIMEOUT_SECONDS
  const screenSaverInterval = Math.round(Math.min((inactivityTimeoutSeconds / 2) * 1000, 60 * 1000)) // check every half of the inactivity timeout, or every minute, whichever is shorter

  const showScreenSaverDialog = () => {
    if (screenSaverDialog && !screenSaverDialog.open) {
      screenSaverDialog.showModal()
    }
  }

  const closeScreenSaverDialog = () => {
    if (screenSaverDialog?.open) {
      screenSaverDialog.close()
    }
  }

  $effect(() => {
    const interval = setInterval(() => {
      if (navigator.userActivation?.isActive) {
        lastActivityTimestamp = new Date()
        return
      }

      const inactivityDuration = (Date.now() - lastActivityTimestamp.getTime()) / 1000
      if (inactivityDuration > inactivityTimeoutSeconds) {
        showScreenSaverDialog()
      }
    }, screenSaverInterval) // check at least every half of the inactivity timeout, but not more than every minute

    return () => clearInterval(interval)
  })
</script>


<dialog bind:this={screenSaverDialog} id="inactivity-dialog" class="ds-dialog" data-placement="center">
  <div class="ds-dialog__block">
    <p class="ds-paragraph">Du har vært inaktiv for lenge, og innholdet er skjult av sikkerhetsmessige årsaker.</p>
  </div>
  <div class="ds-dialog__block">
    <button class="ds-button" data-variant="primary" onclick={closeScreenSaverDialog}>Jeg er her fortsatt jeg 🫡 </button>
  </div>
</dialog>

<style>
  .ds-dialog::backdrop {
		backdrop-filter: blur(10px); /* Blurs what's behind */
  	-webkit-backdrop-filter: blur(10px); /* Safari support */
	}
</style>