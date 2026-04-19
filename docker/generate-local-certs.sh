#!/usr/bin/env bash
set -euo pipefail

if ! command -v mkcert >/dev/null 2>&1; then
  cat >&2 <<'EOF'
mkcert is required for local HTTPS.
Install it with Homebrew:
  brew install mkcert
EOF
  exit 1
fi

cert_dir="${1:-docker/certs}"
cert_file="${cert_dir}/localhost.pem"
key_file="${cert_dir}/localhost-key.pem"

mkdir -p "${cert_dir}"
mkcert -install
mkcert \
  -cert-file "${cert_file}" \
  -key-file "${key_file}" \
  localhost \
  127.0.0.1 \
  ::1 \
  '*.localhost' \
  api.localhost \
  admin.localhost \
  shop.localhost \
  dashboard.localhost \
  kafka.localhost
