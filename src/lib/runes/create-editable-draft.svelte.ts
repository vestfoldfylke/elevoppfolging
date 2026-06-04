import { untrack } from "svelte"

/**
 * The reactive object returned by `createEditableDraft`.
 */
export type EditableDraft<T> = {
  /** Reactive `$state` clone of the source. Mutate directly or use `bind:value` — changes do not affect the original. */
  draft: T
  /** `true` when `draft` differs from the current source value (compared by JSON serialisation). */
  isDirty: boolean
  /** Resets `draft` back to the current source value, discarding all unsaved edits. */
  cancel(): void
}

/**
 * Creates a reactive editing draft from a source value.
 *
 * The returned `draft` is a deep-cloned, mutable copy of the source. Mutating
 * it does not affect the original. When the source changes externally the draft
 * is automatically reset to the new source value. Call `cancel()` at any time
 * to discard local edits and snap back to the source.
 *
 * Must be called in a Svelte component or rune context (uses `$state`, `$derived`, `$effect`).
 *
 * @param getSource Reactive getter returning the source value. Pass a lambda so
 *   runes can track reactivity: `() => someReactiveValue`.
 * @returns Object with `draft` (editable clone), `isDirty` (change flag), and `cancel()`.
 *
 * @example
 * // In a .svelte component:
 * // const editable = createEditableDraft(() => user);
 * // `editable.draft` is reactive state — use bind:value directly:
 * //   <input bind:value={editable.draft.name} />
 * // Check editable.isDirty to show save/cancel controls; call editable.cancel() to revert.
 */
export const createEditableDraft = <T>(getSource: () => T) => {
  const getClonedSource = () => $state.snapshot(getSource())

  let draft = $state({ value: getClonedSource() })

  let isDirty = $derived.by(() => {
    return JSON.stringify(draft.value) !== JSON.stringify(getSource())
  })

  $effect(() => {
    const latestClonedSource = getClonedSource()
    untrack(() => {
      if (JSON.stringify(draft.value) !== JSON.stringify(latestClonedSource)) {
        draft.value = latestClonedSource
      }
    })
  })

  return {
    get draft() {
      return draft.value as T
    },
    set draft(newDraft: T) {
      draft.value = newDraft as ReturnType<typeof getClonedSource>
    },
    get isDirty() {
      return isDirty
    },
    cancel() {
      draft.value = getClonedSource()
    }
  } satisfies EditableDraft<T>
}
