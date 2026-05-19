import type { Collection, Db } from "mongodb"
import type { IAppUsersDbClient } from "$lib/types/db/db-client"
import type { AppUser, NewAppUser } from "$lib/types/db/shared-types"

export class AppUsersDbClient implements IAppUsersDbClient {
  private usersCollection: Collection<NewAppUser>

  constructor(db: Db) {
    this.usersCollection = db.collection<NewAppUser>("users")
  }

  async getAllAppUsers(): Promise<AppUser[]> {
    const appUsers = await this.usersCollection.find({}).toArray()
    return appUsers.map((appUser) => {
      return {
        ...appUser,
        _id: appUser._id.toString()
      }
    })
  }

  async getAppUser(entraUserId: string): Promise<AppUser | null> {
    const appUser = await this.usersCollection.findOne({ "entra.id": entraUserId })
    if (!appUser) {
      return null
    }
    return {
      ...appUser,
      _id: appUser._id.toString()
    }
  }
}
