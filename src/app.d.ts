// See https://svelte.dev/docs/kit/types#app.d.ts

import type { RootLayoutData } from "$lib/types/app-types"

// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    interface PageData extends RootLayoutData {}
    // interface PageState {}
    // interface Platform {}
  }
}
