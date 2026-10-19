import { useState } from "react"
import ConfirmDialog from "./ConfirmDialog"
export default function DemoReset() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn-ghost m4-reset" onClick={() => setOpen(true)}>
        Reset demo
      </button>
      {open && (
        <ConfirmDialog
          title="Reset this demo session?"
          confirm="Reset all demo data"
          onClose={() => setOpen(false)}
          onConfirm={() =>
            window.dispatchEvent(new Event("stagelink:reset-demo"))
          }
        >
          This clears bookings, quotations, payments, messages, attachments,
          saved items and drafts, and restores the sample catalog and accounts.
          Switching roles keeps progress; refreshing also resets it. Each
          browser tab is independent.
        </ConfirmDialog>
      )}
    </>
  )
}
