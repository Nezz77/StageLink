import { useEffect, useState } from "react"
import { attachmentFile } from "../lib/chatAttachments"
import type { Attachment } from "../lib/pipeline"

/** Preview local raster files only; revoke the temporary URL when the message unmounts. */
export default function AttachmentPreview({
  attachment,
}: {
  attachment: Attachment
}) {
  const [url, setUrl] = useState("")
  useEffect(() => {
    const file = attachmentFile(attachment.id)
    if (!file || !/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [attachment.id])
  return url ? (
    <img
      className="m4-attachment-preview"
      src={url}
      alt={`Attachment preview: ${attachment.name}`}
    />
  ) : null
}
