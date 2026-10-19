// Attachments share the demo's page lifetime. No persistent storage or upload.
const files = new Map<string, File>()
const downloads = new Map<string, ReturnType<typeof setTimeout>>()
export function clearAttachments() {
  files.clear()
  downloads.forEach((timer,url) => { clearTimeout(timer); URL.revokeObjectURL(url) })
  downloads.clear()
}
export const attachmentFile = (id: string) => files.get(id)
export function removeAttachment(id: string) { files.delete(id) }

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
  downloads.set(url, setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url) }, 1000))
}
