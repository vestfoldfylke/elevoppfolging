import { env } from "$env/dynamic/private"
import { SyncStudents } from "$lib/server/cron-jobs/sync-students"
import { syncUsers } from "$lib/server/cron-jobs/sync-users"
import type { AppUser } from "$lib/types/db/db-client"

const userSyncInterval: number = parseInt(env.USER_SYNC_INTERVAL_MINUTES) * 1000 * 60

setInterval(async () => {
	await syncUsers()
}, userSyncInterval)

const appUsers: AppUser[] = await syncUsers()
const syncStudentsClient = new SyncStudents(appUsers)
await syncStudentsClient.syncStudents()
