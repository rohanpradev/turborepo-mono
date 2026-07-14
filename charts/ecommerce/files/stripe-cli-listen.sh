#!/bin/sh
set -eu

if [ -z "${STRIPE_API_KEY:-}" ]; then
  echo "STRIPE_API_KEY is required to start the Stripe CLI listener." >&2
  exit 1
fi

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
  --events "${STRIPE_CLI_EVENTS:-checkout.session.completed,checkout.session.async_payment_succeeded}" \
  > "$log_pipe" 2>&1 || stripe_status=$?

wait "$awk_pid"
exit "$stripe_status"
