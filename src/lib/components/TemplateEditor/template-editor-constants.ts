import type { DocumentContentItem } from "$lib/types/db/shared-types"

export const templateEditorContentItemNames: Record<DocumentContentItem["type"], string> = {
  header: "Overskrift",
  paragraph: "Tekstavsnitt",
  info: "Informasjon",
  inputText: "Tekstfelt",
  textarea: "Tekstområde",
  radioGroup: "Radioknappgruppe",
  checkboxGroup: "Avkrysningsgruppe"
}

export const templateEditorContentItemIcons: Record<DocumentContentItem["type"], string> = {
  header: "title",
  paragraph: "text_fields",
  info: "info",
  inputText: "text_fields_alt",
  textarea: "format_align_left",
  radioGroup: "task_alt",
  checkboxGroup: "check_box"
}
