import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

export default function ConfirmDialog({
  title,
  children,
  confirm,
  onClose,
  onConfirm,
}: {
  title: string
  children: ReactNode
  confirm: string
  onClose: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement
    const dialog = ref.current!
    dialog.showModal()
    return () => {
      dialog.close()
      trigger?.focus()
    }
  }, [])
  return (
    <dialog
      className="pw-dialog"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      aria-labelledby="pw-dialog-title"
    >
      <div className="pw-dialog-content">
        <button
          className="pw-icon pw-dialog-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <span className="sl-eyebrow">ONE LAST CHECK</span>
        <h2 id="pw-dialog-title">{title}</h2>
        <p>{children}</p>
        <div className="pw-actions">
          <button className="btn-ghost" onClick={onClose}>
            Go back
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </div>
    </dialog>
  )
}
