import { useEffect, useRef, useState } from "react"
export default function ChatDemoControls({
  onTyping,
  onReply,
  onSeen,
  onUnread,
}: {
  onTyping: (typing: boolean) => void
  onReply: (text: string) => void
  onSeen: () => void
  onUnread: () => void
}) {
  const [text, setText] = useState(
    "Thanks, I have reviewed the event details. Let’s coordinate the soundcheck here.",
  )
  const [typing, setTyping] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setTyping(false)
    onTyping(false)
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      onTyping(false)
    },
    [onTyping],
  )
  return (
    <details className="m4-demo-controls">
      <summary>Chat demonstration controls</summary>
      <p>
        No network connection or real participant. These controls simulate the
        other participant in this conversation only.
      </p>
      <label className="mg-field">
        Demo incoming reply
        <input
          value={text}
          maxLength={4000}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="pw-actions">
        <button
          type="button"
          className="btn-ghost"
          disabled={typing}
          onClick={() => {
            stop()
            setTyping(true)
            onTyping(true)
            timer.current = setTimeout(stop, 3500)
          }}
        >
          Simulate typing
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={!text.trim()}
          onClick={() => {
            stop()
            onReply(text)
          }}
        >
          Simulate incoming reply
        </button>
        <button type="button" className="btn-ghost" onClick={onSeen}>
          Simulate seen
        </button>
        <button type="button" className="btn-ghost" onClick={onUnread}>
          Demonstrate unread
        </button>
      </div>
    </details>
  )
}
