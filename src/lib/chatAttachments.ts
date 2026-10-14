// Files stay in this browser's IndexedDB. No upload or remote delivery is implied.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("stagelink-chat-files", 1)
    request.onupgradeneeded = () => request.result.createObjectStore("files")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function saveAttachment(id: string, file: File) {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite")
      tx.objectStore("files").put(file, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
export async function downloadAttachment(id: string, name: string) {
  const db = await database()
  try {
    const file = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction("files").objectStore("files").get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    if (!file)
      throw new Error("This attachment is no longer available in this browser.")
    const url = URL.createObjectURL(file)
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } finally {
    db.close()
  }
}
