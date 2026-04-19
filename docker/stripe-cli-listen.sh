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
umask 077

log_pipe=$(mktemp -u /tmp/stripe-listen.XXXXXX)
mkfifo "$log_pipe"

cleanup() {
  rm -f "$log_pipe"
  rm -f "$secret_file"
}

trap cleanup EXIT HUP INT TERM
rm -f "$secret_file"

awk -v secret_file="$secret_file" '
{
  print;
  if (match($0, /whsec_[A-Za-z0-9]+/)) {
    secret = substr($0, RSTART, RLENGTH);
    print secret > secret_file;
    close(secret_file);
    print "Stored Stripe webhook secret in " secret_file > "/dev/stderr";
  }
  fflush();
}
' < "$log_pipe" &
awk_pid=$!

stripe_status=0
stripe listen \
  --forward-to "$STRIPE_WEBHOOK_FORWARD_TO" \
  --events "${STRIPE_CLI_EVENTS:-checkout.session.completed,payment_intent.succeeded,payment_intent.payment_failed}" \
  > "$log_pipe" 2>&1 || stripe_status=$?

wait "$awk_pid"
exit "$stripe_status"
