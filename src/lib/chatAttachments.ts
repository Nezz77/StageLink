// Attachments share the demo's page lifetime. No persistent storage or upload.
const files = new Map<string, File>()

export async function saveAttachment(id: string, file: File) {
  files.set(id, file)
}

export async function downloadAttachment(id: string, name: string) {
  const file = files.get(id)
  if (!file)
    throw new Error("This demo attachment is no longer available. Refresh clears attachments.")
  const url = URL.createObjectURL(file)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
