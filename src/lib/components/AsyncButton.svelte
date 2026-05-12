<script lang="ts">
  import { invalidateAll } from "$app/navigation"

  type AsyncButtonProps = {
    buttonText: string
    onClick: () => Promise<void>
    variant?: "primary" | "secondary" | "tertiary"
    color?: "accent" | "danger"
    dataSize?: "sm" | "md" | "lg"
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
    dataSize = "md",
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

  let errorElement: HTMLDivElement | null = $state(null)

  $effect(() => {
    const el = errorElement
    if (!buttonState.errorMessage || !el) {
      return
    }

    const timer = setTimeout(() => {
      el.classList.add("slide-out")
    }, 5000)

    return () => clearTimeout(timer)
  })

  const wrappedOnClick = async () => {
    buttonState.loading = true

    buttonState.errorMessage = null
    if (typeof errorMessage === "string") {
      errorMessage = ""
    }

    try {
      await onClick()

      if (!reloadPageDataOnSuccess) {
        return
      }

      await invalidateAll()
      console.log("Page data invalidated successfully")

      if (callBackAfterReloadPageData) {
        callBackAfterReloadPageData()
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

<button type="button" class="ds-button" data-variant={variant} data-color={color} data-size={dataSize} onclick={wrappedOnClick} disabled={buttonState.loading || disabled}>
  {#if !buttonState.loading}
    {#if iconName}
      <span class="material-symbols-outlined">{iconName}</span>
    {/if}
    {buttonText}
  {:else}
    <svg aria-label="Laster..." class="ds-spinner" role="img" viewBox="0 0 50 50">
      <circle class="ds-spinner__background" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
      <circle class="ds-spinner__circle" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
    </svg>
    {buttonText}
  {/if}
</button>

{#if buttonState.errorMessage}
  <div bind:this={errorElement} class="ds-alert error-message" data-color="danger">
    {buttonState.errorMessage}
  </div>
{/if}

<style>
  .error-message {
    position: fixed;
    z-index: 10;
    top: calc(10vh - 70px);
    left: calc(100vw - 375px);
    margin: 0;
    max-width: 350px;
    border-radius: 5px;
  }

  .error-message:global(.slide-out) {
    animation: slideOutRight 0.5s forwards;
  }

  @keyframes slideOutRight {
    to {
      transform: translateX(120%);
      opacity: 0;
    }
  }
</style>