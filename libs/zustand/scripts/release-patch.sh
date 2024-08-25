#!/usr/bin/env bash

set -euo pipefail

pnpm run check
pnpm run build
pnpm npm version patch --no-git-tag-version
pnpm npm publish --tag "latest"