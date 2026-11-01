CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  available_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TIMESTAMPTZ(3),
  enqueued_at TIMESTAMPTZ(3),
  processed_at TIMESTAMPTZ(3),
  dead_lettered_at TIMESTAMPTZ(3),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code TEXT,
  CHECK (NOT (processed_at IS NOT NULL AND dead_lettered_at IS NOT NULL))
);
CREATE INDEX outbox_pending_idx ON outbox_events (available_at, created_at)
  WHERE processed_at IS NULL AND dead_lettered_at IS NULL;
CREATE TABLE consumed_events (
  consumer TEXT NOT NULL,
  event_id UUID NOT NULL REFERENCES outbox_events(id),
  processed_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (consumer, event_id)
);
CREATE TABLE foundation_receipts (
  event_id UUID PRIMARY KEY REFERENCES outbox_events(id),
  received_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
