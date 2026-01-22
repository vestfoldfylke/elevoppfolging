import type { PageServerLoad } from "./$types";
import type { IDbClient } from "$lib/types/db/db-client";
import { getDbClient } from "$lib/server/db/get-db-client";
import type {AppStudent} from "$lib/types/student";
import type {ServerLoadNextFunction} from "$lib/types/middleware/http-request";
import {serverLoadRequestMiddleware} from "$lib/server/middleware/http-request";

type StudentsPageData = {
  students: AppStudent[]
}

const getStudents: ServerLoadNextFunction<StudentsPageData> = async () => {
  const dbClient: IDbClient = getDbClient();
  const students: AppStudent[] = await dbClient.getStudents();

  return {
    data: {
      students
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentsPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getStudents)
}
