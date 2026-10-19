import BookingWorkspace from './BookingWorkspace'
/** Compatibility entry point. All messages, quotations and payments use the active pipeline. */
export default function BookingChat({ initialTab = 'chat', onBack }: { initialTab?: 'chat' | 'checkout'; onBack: () => void }) {
  return <BookingWorkspace initialSection={initialTab === 'checkout' ? 'payments' : 'chat'} initialBookingId="BK-2901" onBack={onBack} onGoToLanding={onBack} />
}
