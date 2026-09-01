#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

if [[ -z "${repo_root}" || "${repo_root}" != "${script_root}" || ! -f "${repo_root}/package.json" || ! -f "${repo_root}/turbo.json" ]]; then
  echo "Refusing to clean: scripts/clean-workspace.sh must run from this repository." >&2
  exit 1
fi

cd "${repo_root}"

find . -xdev -type d \( \
  -name node_modules -o \
  -name .next -o \
  -name .turbo -o \
  -name out -o \
  -name coverage -o \
  -name dist -o \
  -name build -o \
  -name .cache \
\) -prune -exec rm -rf -- {} +

find . -xdev -type f -name '*.tsbuildinfo' -delete
rm -rf -- "${repo_root}/.runtime"
