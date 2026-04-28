import { logger } from "@vestfoldfylke/loglady"
import { type Binary, ClientEncryption, type ClientEncryptionEncryptOptions, MongoClient, type UUID } from "mongodb"
import { env } from "$env/dynamic/private"
import type { IDbClient } from "$lib/types/db/db-client"
import { mockDbClient } from "./mock/mock-db-client"
import { AccessDbClient } from "./mongo/access-db-client"
import { AppUsersDbClient } from "./mongo/appusers-db-client"
import { DocumentContentTemplatesDbClient } from "./mongo/document-content-templates-db-client"
import { DocumentsDbClient } from "./mongo/documents-db-client"
import { EmailAlertsDbClient } from "./mongo/email-alerts-db-client"
import { StudentCheckBoxDbClient } from "./mongo/importantstuff-db-client"
import { ProgramAreasDbClient } from "./mongo/program-areas-db-client"
import { SchoolsDbClient } from "./mongo/schools-db-client"
import { StudentDataSharingConsentsDbClient } from "./mongo/student-data-sharing-consent-db-client"
import { ImportantStuffDbClient } from "./mongo/studentcheckbox-db-client"
import { StudentsDbClient } from "./mongo/students-db-client"

let dbClient: IDbClient

if (env.MOCK_DB === "true") {
  dbClient = mockDbClient
} else {
  if (!env.MONGODB_CONNECTION_STRING) {
    throw new Error("MONGODB_CONNECTION_STRING is not set (du har glemt den)")
  }
  if (!env.MONGODB_DATABASE_NAME) {
    throw new Error("MONGODB_DATABASE_NAME is not set (du har glemt den)")
  }
  if (!env.AZURE_TENANT_ID || !env.AZURE_CLIENT_ID || !env.AZURE_CLIENT_SECRET) {
    throw new Error("Azure credentials for client-side encryption is not fully set (du har glemt en av AZURE_TENANT_ID, AZURE_CLIENT_ID eller AZURE_CLIENT_SECRET)")
  }

  // Encryption settings
  const keyVaultNamespace = `${env.MONGODB_DATABASE_NAME}.__keyVault`
  const kmsProviders = {
    azure: {
      tenantId: env.AZURE_TENANT_ID,
      clientId: env.AZURE_CLIENT_ID,
      clientSecret: env.AZURE_CLIENT_SECRET
    }
  }

  // Client with auto-encryption enabled
  const mongoEncryptionClient = new MongoClient(env.MONGODB_CONNECTION_STRING, {
    autoEncryption: {
      keyVaultNamespace: keyVaultNamespace,
      kmsProviders: kmsProviders,
      bypassAutoEncryption: true
    }
  })

  const mongoClient = new MongoClient(env.MONGODB_CONNECTION_STRING)

  try {
    await mongoEncryptionClient.connect()
    await mongoClient.connect()
  } catch (error) {
    logger.errorException(error, "Error when connecting to MongoDB - check your configuration")
    await logger.flush()
    throw error
  }

  const dbWithEncryption = mongoEncryptionClient.db(env.MONGODB_DATABASE_NAME)
  const dbWithoutEncryption = mongoClient.db(env.MONGODB_DATABASE_NAME)

  const encryptionClient = new ClientEncryption(mongoEncryptionClient, {
    keyVaultNamespace: keyVaultNamespace,
    kmsProviders: kmsProviders
  })

  let encryptionKeyIds: UUID[] = []
  try {
    encryptionKeyIds = (await encryptionClient.getKeys().toArray()).map((key) => key._id)
  } catch (error) {
    logger.errorException(error, "Error when fetching encryption keys from MongoDB, check your configuration")
    await logger.flush()
    throw error
  }

  const encryptValue = async (value: unknown): Promise<Binary> => {
    const encryptionOptions: ClientEncryptionEncryptOptions = {
      algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
      keyId: encryptionKeyIds[Math.floor(Math.random() * encryptionKeyIds.length)] // Use a random key
    }
    return await encryptionClient.encrypt(value, encryptionOptions)
  }

  dbClient = {
    appUsers: new AppUsersDbClient(dbWithoutEncryption),
    access: new AccessDbClient(dbWithoutEncryption),
    documentContentTemplates: new DocumentContentTemplatesDbClient(dbWithoutEncryption),
    documents: new DocumentsDbClient(dbWithEncryption, encryptValue),
    emailAlerts: new EmailAlertsDbClient(dbWithoutEncryption),
    importantStuff: new ImportantStuffDbClient(dbWithEncryption, encryptValue),
    programAreas: new ProgramAreasDbClient(dbWithoutEncryption),
    schools: new SchoolsDbClient(dbWithoutEncryption),
    studentCheckBoxes: new StudentCheckBoxDbClient(dbWithEncryption, encryptValue),
    studentDataSharingConsents: new StudentDataSharingConsentsDbClient(dbWithoutEncryption),
    students: new StudentsDbClient(dbWithoutEncryption)
  }
}

export const getDbClient = (): IDbClient => dbClient
