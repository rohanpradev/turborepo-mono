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

if [[ -s "${cert_file}" && -s "${key_file}" ]]; then
  chmod 0644 "${cert_file}" "${key_file}" 2>/dev/null || true

  if command -v openssl >/dev/null 2>&1 && openssl x509 -checkend 86400 -noout -in "${cert_file}" >/dev/null 2>&1; then
    echo "Using existing local TLS certificate at ${cert_file}"
    exit 0
  fi
fi

if ! mkcert -install; then
  cat >&2 <<'EOF'
mkcert could not install its local CA into the system trust store.
Continuing with certificate generation; browsers may warn until you run:
  mkcert -install
EOF
fi

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

chmod 0644 "${cert_file}" "${key_file}" 2>/dev/null || true
