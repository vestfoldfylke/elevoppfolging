<script lang="ts">
  import { invalidateAll } from "$app/navigation"

  export type SuccessResult = { status: "success"; reloadPageData?: boolean; callBack?: () => void }
  export type CancelResult = { status: "cancelled"; callBack?: () => void }
  export type ErrorResult = { status: "error"; message: string }
  export type AsyncButtonResult = SuccessResult | CancelResult | ErrorResult

  type AsyncButtonProps = {
    buttonText: string
    onClick: () => Promise<AsyncButtonResult>
    variant?: "primary" | "secondary" | "tertiary"
    color?: "accent" | "danger"
    dataSize?: "sm" | "md" | "lg"
    iconName?: string
    disabled?: boolean
  }

  let { buttonText, onClick, iconName, variant = "primary", color = "accent", dataSize = "md", disabled = false }: AsyncButtonProps = $props()

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
    }, 10000)

    return () => clearTimeout(timer)
  })

  const wrappedOnClick = async () => {
    buttonState.loading = true
    buttonState.errorMessage = null

    try {
      const result = await onClick()

      switch (result.status) {
        case "cancelled":
          result.callBack?.()
          return

        case "error":
          buttonState.errorMessage = result.message
          return

        case "success":
          if (result.reloadPageData) {
            await invalidateAll()
          }
          result.callBack?.()
          return
      }
    } catch (error) {
      buttonState.errorMessage = error instanceof Error ? error.message : "An error occurred. Please try again."
    } finally {
      buttonState.loading = false
    }
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
    z-index: 100;
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