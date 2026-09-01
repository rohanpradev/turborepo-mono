#!/bin/sh
set -eu

stripe_api_key="${STRIPE_API_KEY:-${STRIPE_SECRET_KEY:-}}"

if [ -z "$stripe_api_key" ]; then
  echo "Either STRIPE_API_KEY or STRIPE_SECRET_KEY is required to start the Stripe CLI listener." >&2
  exit 1
fi

export STRIPE_API_KEY="$stripe_api_key"

if [ -z "${STRIPE_WEBHOOK_FORWARD_TO:-}" ]; then
  echo "STRIPE_WEBHOOK_FORWARD_TO is required to start the Stripe CLI listener." >&2
  exit 1
fi

secret_file="${STRIPE_WEBHOOK_SECRET_FILE:-/var/run/stripe/webhook-secret}"
secret_dir=$(dirname "$secret_file")
mkdir -p "$secret_dir"
# The dedicated runtime volume is mounted read-only by payment-service. Keep the
# listener as the only writer while allowing the non-root payment user to read
# the listener-generated secret across the container boundary.
umask 033

temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/stripe-listen.XXXXXX")
log_pipe="${temp_dir}/listener.pipe"
mkfifo "$log_pipe"

cleanup() {
  rm -f "$log_pipe"
  rm -f "$secret_file"
  rmdir "$temp_dir" 2>/dev/null || true
}

trap cleanup EXIT HUP INT TERM
rm -f "$secret_file"

awk -v secret_file="$secret_file" '
{
  if (match($0, /whsec_[A-Za-z0-9]+/)) {
    secret = substr($0, RSTART, RLENGTH);
    print secret > secret_file;
    close(secret_file);
    print "Stored Stripe webhook signing secret." > "/dev/stderr";
    sub(/whsec_[A-Za-z0-9]+/, "whsec_[REDACTED]");
  }
  print;
  fflush();
}
' < "$log_pipe" &
awk_pid=$!

stripe_status=0
stripe listen \
  --skip-update \
  --forward-to "$STRIPE_WEBHOOK_FORWARD_TO" \
  --events "${STRIPE_CLI_EVENTS:-checkout.session.completed,payment_intent.succeeded,payment_intent.payment_failed}" \
  > "$log_pipe" 2>&1 || stripe_status=$?

wait "$awk_pid"
exit "$stripe_status"
