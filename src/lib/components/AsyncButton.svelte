<script lang="ts">
  import { invalidateAll } from "$app/navigation"

  type AsyncButtonProps = {
    buttonText: string
    onClick: () => Promise<void>
    variant?: "primary" | "secondary" | "tertiary"
    color?: "accent" | "danger"
    iconName?: string
    reloadPageDataOnSuccess?: boolean
    /** If you need anything to trigger after page data is reloaded (requires reloadPageDataOnSuccess to be true) */
    callBackAfterReloadPageData?: () => void
    errorMessage?: string
    disabled?: boolean
  }

  let {
    buttonText,
    onClick,
    iconName,
    variant = "primary",
    color = "accent",
    reloadPageDataOnSuccess = false,
    callBackAfterReloadPageData,
    errorMessage = $bindable(),
    disabled = false
  }: AsyncButtonProps = $props()

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
      // TODO - vent med loading state til data er reloaded, og gi en feimelding med beskjed om å laste inn siden på nytt hvis det feiler (ctrl + r)
      if (reloadPageDataOnSuccess) {
        await invalidateAll()
        console.log("Page data invalidated successfully")
        if (callBackAfterReloadPageData) {
          callBackAfterReloadPageData()
        }
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

<button type="button" class="ds-button" data-variant={variant} data-color={color} onclick={wrappedOnClick} disabled={buttonState.loading || disabled}>
  {#if iconName}
    <span class="material-symbols-outlined">{iconName}</span>
  {/if}
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