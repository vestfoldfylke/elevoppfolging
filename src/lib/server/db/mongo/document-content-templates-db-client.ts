import { type Collection, type Db, ObjectId } from "mongodb"
import type { IDocumentContentTemplatesDbClient } from "$lib/types/db/db-client"
import type { AvailableForDocumentType, DocumentContentTemplate, MetricCount, MetricLabel, NewDocumentContentTemplate } from "$lib/types/db/shared-types"
import { incrementCount, metricResultFailure, metricResultName, metricResultSuccessful } from "../../metrics/handle-metrics"

export class DocumentContentTemplatesDbClient implements IDocumentContentTemplatesDbClient {
  private documentContentTemplatesCollection: Collection<NewDocumentContentTemplate>

  constructor(db: Db) {
    this.documentContentTemplatesCollection = db.collection<NewDocumentContentTemplate>("document-content-templates")
  }

  async getDocumentContentTemplates(availableFor?: AvailableForDocumentType): Promise<DocumentContentTemplate[]> {
    const availableForQuery: Record<string, unknown> = {}

    if (availableFor?.student && availableFor?.group) {
      availableForQuery.$or = [{ "availableForDocumentType.student": availableFor.student }, { "availableForDocumentType.group": availableFor.group }]
    } else if (availableFor?.student) {
      availableForQuery["availableForDocumentType.student"] = availableFor.student
    } else if (availableFor?.group) {
      availableForQuery["availableForDocumentType.group"] = availableFor.group
    }

    const templates = await this.documentContentTemplatesCollection.find(availableForQuery).toArray()

    return templates.map((template) => ({
      ...template,
      _id: template._id.toString()
    }))
  }

  async getDocumentContentTemplateById(templateId: string): Promise<DocumentContentTemplate | null> {
    const template = await this.documentContentTemplatesCollection.findOne({ _id: new ObjectId(templateId) })

    if (!template) {
      return null
    }

    return {
      ...template,
      _id: template._id.toString()
    }
  }

  async createDocumentContentTemplate(template: NewDocumentContentTemplate): Promise<string> {
    const result = await this.documentContentTemplatesCollection.insertOne(template)

    const metricBody: MetricCount = {
      name: "DocumentTemplate_Create",
      description: "Number of document templates created",
      splitMetricByLabels: true,
      includeLabelsInSplit: false
    }
    const labels: MetricLabel[] = []

    if (template.availableForDocumentType.group) {
      labels.push(["availableForClasses", template.availableForDocumentType.group.toString()])
    }

    if (template.availableForDocumentType.student) {
      labels.push(["availableForStudents", template.availableForDocumentType.student.toString()])
    }

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create document template")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result.insertedId.toString()
  }

  async updateDocumentContentTemplate(templateId: string, template: NewDocumentContentTemplate): Promise<string> {
    const result = await this.documentContentTemplatesCollection.updateOne({ _id: new ObjectId(templateId) }, { $set: { ...template } })

    const metricBody: MetricCount = {
      name: "DocumentTemplate_Update",
      description: "Number of document templates updated",
      splitMetricByLabels: true,
      includeLabelsInSplit: false
    }
    const labels: MetricLabel[] = []

    if (template.availableForDocumentType.group) {
      labels.push(["availableForClasses", template.availableForDocumentType.group.toString()])
    }

    if (template.availableForDocumentType.student) {
      labels.push(["availableForStudents", template.availableForDocumentType.student.toString()])
    }

    if (result.modifiedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update document content template")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return templateId
  }

  async deleteDocumentContentTemplate(templateId: string): Promise<void> {
    const result = await this.documentContentTemplatesCollection.deleteOne({ _id: new ObjectId(templateId) })

    const metricBody: MetricCount = {
      name: "DocumentTemplate_Remove",
      description: "Number of document templates removed"
    }

    if (result.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to delete document content template")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation
  }
}
