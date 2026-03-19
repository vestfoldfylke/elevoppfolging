import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (): Promise<void> => {
  redirect(302, "/")
}
