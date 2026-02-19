<script lang="ts">
  import { invalidateAll } from "$app/navigation"

  type AsyncButtonProps = {
    buttonText: string
    onClick: () => Promise<void>
    reloadPageDataOnSuccess?: boolean
    /** If you need anything to trigger after page data is reloaded (requires reloadPageDataOnSuccess to be true) */
    callBackAfterReloadPageData?: () => void
    errorMessage?: string
  }

  let { buttonText, onClick, reloadPageDataOnSuccess = false, callBackAfterReloadPageData, errorMessage = $bindable() }: AsyncButtonProps = $props()

  type ButtonState = {
    loading: boolean
    errorMessage: string | null
  }

  let buttonState: ButtonState = $state({
    loading: false,
    errorMessage: null
  })

  const wrappedOnClick = async () => {
    buttonState.loading = true

    buttonState.errorMessage = null
    if (typeof errorMessage === "string") {
      errorMessage = ""
    }

    try {
      await onClick()

      if (reloadPageDataOnSuccess) {
        invalidateAll()
          .then(() => {
            console.log("Page data invalidated successfully")
            if (callBackAfterReloadPageData) {
              callBackAfterReloadPageData()
            }
          })
          .catch((error) => {
            console.error("Error invalidating page data:", error)
          })
      }
    } catch (error) {
      console.error("Error in AsyncButton onClick:", error)
      buttonState.errorMessage = error instanceof Error ? error.message : "An error occurred. Please try again."
      if (typeof errorMessage === "string") {
        errorMessage = buttonState.errorMessage
      }
    }
    buttonState.loading = false
  }
</script>

<button type="button" onclick={wrappedOnClick} disabled={buttonState.loading}>
  {buttonState.loading ? "Laster..." : buttonText}
</button>

{#if buttonState.errorMessage}
  <p class="error">{buttonState.errorMessage}</p>
{/if}

<style>
  .error {
    color: red;
    margin-top: 0.5rem;
  }
</style>