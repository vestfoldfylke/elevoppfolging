import { logger } from "@vestfoldfylke/loglady"
import { type Binary, ClientEncryption, type ClientEncryptionEncryptOptions, MongoClient, type UUID } from "mongodb"
import { env } from "$env/dynamic/private"
import type { IDbClient } from "$lib/types/db/db-client"
import { mockDbClient } from "./mock/mock-db-client"
import { AccessDbClient } from "./mongo/access-db-client"
import { AppUsersDbClient } from "./mongo/appusers-db-client"
import { AuditLogsDbClient } from "./mongo/audit-logs-db-client"
import { DocumentContentTemplatesDbClient } from "./mongo/document-content-templates-db-client"
import { DocumentsDbClient } from "./mongo/documents-db-client"
import { EmailAlertsDbClient } from "./mongo/email-alerts-db-client"
import { ImportantStuffDbClient } from "./mongo/importantstuff-db-client"
import { ProgramAreasDbClient } from "./mongo/program-areas-db-client"
import { SchoolsDbClient } from "./mongo/schools-db-client"
import { StudentDataSharingConsentsDbClient } from "./mongo/student-data-sharing-consent-db-client"
import { StudentCheckBoxDbClient } from "./mongo/studentcheckbox-db-client"
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

  try {
    await mongoEncryptionClient.connect()
  } catch (error) {
    logger.errorException(error, "Error when connecting to MongoDB - check your configuration")
    await logger.flush()
    throw error
  }

  const dbWithEncryption = mongoEncryptionClient.db(env.MONGODB_DATABASE_NAME)

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

    await mongoEncryptionClient.close()

    throw error
  }

  if (encryptionKeyIds.length === 0) {
    logger.error("No encryption keys found in MongoDB")
    await logger.flush()

    await mongoEncryptionClient.close()

    throw new Error("No encryption keys found in MongoDB")
  }

  const encryptValue = async (value: unknown): Promise<Binary> => {
    const encryptionOptions: ClientEncryptionEncryptOptions = {
      algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
      keyId: encryptionKeyIds[Math.floor(Math.random() * encryptionKeyIds.length)] // Use a random key
    }
    return await encryptionClient.encrypt(value, encryptionOptions)
  }

  dbClient = {
    appUsers: new AppUsersDbClient(dbWithEncryption),
    access: new AccessDbClient(dbWithEncryption),
    auditLogs: new AuditLogsDbClient(dbWithEncryption),
    documentContentTemplates: new DocumentContentTemplatesDbClient(dbWithEncryption),
    documents: new DocumentsDbClient(dbWithEncryption, encryptValue),
    emailAlerts: new EmailAlertsDbClient(dbWithEncryption),
    importantStuff: new ImportantStuffDbClient(dbWithEncryption, encryptValue),
    programAreas: new ProgramAreasDbClient(dbWithEncryption),
    schools: new SchoolsDbClient(dbWithEncryption),
    studentCheckBoxes: new StudentCheckBoxDbClient(dbWithEncryption, encryptValue),
    studentDataSharingConsents: new StudentDataSharingConsentsDbClient(dbWithEncryption),
    students: new StudentsDbClient(dbWithEncryption, encryptValue)
  }
}

export const getDbClient = (): IDbClient => dbClient
