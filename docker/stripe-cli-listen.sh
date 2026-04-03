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

stripe listen \
  --forward-to "$STRIPE_WEBHOOK_FORWARD_TO" \
  --events "${STRIPE_CLI_EVENTS:-checkout.session.completed,payment_intent.succeeded,payment_intent.payment_failed}" \
  2>&1 | awk -v secret_file="$secret_file" '
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
'
