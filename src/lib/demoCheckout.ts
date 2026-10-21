export type DemoPaymentOutcome = 'success' | 'declined' | 'pending' | 'stale';
export type DemoPaymentPhase = 'processing' | 'pending' | 'declined' | 'stale' | 'success' | 'cancelled';

/** Local demo attempt: only a confirmed response can collect the accepted snapshot. */
export function createDemoPaymentAttempt(collect: () => boolean, declined?: () => void) {
  let phase: DemoPaymentPhase = 'processing';
  return {
    resolve(outcome: DemoPaymentOutcome): DemoPaymentPhase {
      if (phase !== 'processing' && phase !== 'pending') return phase;
      if (outcome === 'pending') return phase = 'pending';
      if (outcome === 'declined') {
        phase = 'declined';
        declined?.();
      } else if (outcome === 'stale') {
        phase = 'stale';
      } else {
        // Lock before calling the ledger, including against a repeated callback.
        phase = 'success';
        if (!collect()) phase = 'stale';
      }
      return phase;
    },
    cancel() {
      if (phase === 'processing' || phase === 'pending') phase = 'cancelled';
      return phase;
    },
  };
}
